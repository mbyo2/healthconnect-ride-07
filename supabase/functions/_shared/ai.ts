/**
 * Doc' O Clock AI — single source of truth for the models used by every AI
 * edge function in this project.
 *
 * Primary provider: OpenRouter (OpenAI-compatible chat completions).
 * Fallbacks, in order:
 *   1. the other OpenRouter models in AI_MODEL_CHAIN (free tiers get
 *      rate-limited upstream, so we roll over instead of failing),
 *   2. HuggingFace inference (when HF_TOKEN is set),
 *   3. the Lovable AI gateway (when LOVABLE_API_KEY is set).
 */

export const AI_MODEL = "inclusionai/ling-3.0-flash-sante:free";

/** Ordered OpenRouter model chain. First entry is the primary model. */
export const AI_MODEL_CHAIN = [
  AI_MODEL,
  "inclusionai/ling-3.0-flash-vl:free",
  "thinkingmachines/inkling:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

/** Short label returned to clients in API responses. */
export const AI_MODEL_LABEL = "Doc' O Clock AI";

/** OpenAI-compatible chat completions endpoint on OpenRouter. */
export const AI_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** Fallback model + endpoint (HuggingFace) if OpenRouter is not configured. */
export const FALLBACK_MODEL = "google/medgemma-1.5-4b-it";
export const FALLBACK_ENDPOINT = "https://api-inference.huggingface.co/v1/chat/completions";

/** Lovable AI gateway (last-resort fallback, also used for vision). */
export const LOVABLE_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const LOVABLE_TEXT_MODEL = "google/gemini-2.5-flash";

export interface AIProvider {
  endpoint: string;
  model: string;
  headers: Record<string, string>;
  provider: "openrouter" | "huggingface" | "lovable";
  /** Extra models to try on the same endpoint when the first one fails. */
  models: string[];
}

function openRouterProvider(key: string): AIProvider {
  return {
    endpoint: AI_ENDPOINT,
    model: AI_MODEL,
    models: AI_MODEL_CHAIN,
    provider: "openrouter",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://doc0clock.online",
      "X-Title": "Doc' O Clock",
    },
  };
}

function huggingFaceProvider(token: string): AIProvider {
  return {
    endpoint: FALLBACK_ENDPOINT,
    model: FALLBACK_MODEL,
    models: [FALLBACK_MODEL],
    provider: "huggingface",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

function lovableProvider(key: string): AIProvider {
  return {
    endpoint: LOVABLE_ENDPOINT,
    model: LOVABLE_TEXT_MODEL,
    models: [LOVABLE_TEXT_MODEL],
    provider: "lovable",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

/**
 * Resolves the preferred AI provider. Prefers OpenRouter, then HuggingFace,
 * then the Lovable AI gateway. Returns null when none is configured so callers
 * can return a clear 503.
 */
export function resolveAIProvider(): AIProvider | null {
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) return openRouterProvider(openRouterKey);

  const hfToken = Deno.env.get("HF_TOKEN");
  if (hfToken) return huggingFaceProvider(hfToken);

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return lovableProvider(lovableKey);

  return null;
}

/** Every configured provider, in preference order. */
export function resolveAIProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) providers.push(openRouterProvider(openRouterKey));
  const hfToken = Deno.env.get("HF_TOKEN");
  if (hfToken) providers.push(huggingFaceProvider(hfToken));
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) providers.push(lovableProvider(lovableKey));
  return providers;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: unknown;
}

export interface CallAIOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  /** Retry attempts per model for transient failures (429 / 5xx). */
  retries?: number;
  /** Abort signal for the underlying fetch calls. */
  signal?: AbortSignal;
}

export interface CallAIResult {
  text: string;
  model: string;
  provider: string;
}

export class AIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

/**
 * Pulls the assistant text out of an OpenAI-compatible response. Reasoning
 * models can return `content: null` with the answer only in `reasoning`, so we
 * fall back to that instead of surfacing an empty reply.
 */
export function extractAIText(data: any): string {
  const choice = data?.choices?.[0];
  const msg = choice?.message;
  const content = msg?.content;

  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content
      .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
      .join("")
      .trim();
    if (joined) return joined;
  }

  const reasoning =
    (typeof msg?.reasoning === "string" && msg.reasoning) ||
    (Array.isArray(msg?.reasoning_details)
      ? msg.reasoning_details.map((r: any) => r?.text ?? "").join("").trim()
      : "");
  if (reasoning && String(reasoning).trim()) return String(reasoning).trim();

  if (typeof choice?.text === "string" && choice.text.trim()) return choice.text.trim();
  return "";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the AI providers/models in order until one returns usable text.
 * Retries transient failures (429 / 5xx) with bounded backoff, then rolls over
 * to the next model, then to the next provider.
 * Throws AIError carrying a status when everything fails.
 */
export async function chatComplete(options: CallAIOptions): Promise<CallAIResult> {
  const providers = resolveAIProviders();
  if (providers.length === 0) {
    throw new AIError(
      "AI service not configured. Set OPENROUTER_API_KEY in edge function secrets.",
      503,
    );
  }

  const retries = options.retries ?? 1;
  let last: AIError | null = null;

  for (const provider of providers) {
    for (const model of provider.models) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        let response: Response;
        try {
          response = await fetch(provider.endpoint, {
            method: "POST",
            headers: provider.headers,
            body: JSON.stringify({
              model,
              messages: options.messages,
              max_tokens: options.maxTokens ?? 1200,
              temperature: options.temperature ?? 0.3,
              ...(options.topP ? { top_p: options.topP } : {}),
              stream: false,
            }),
            signal: options.signal,
          });
        } catch (networkError: any) {
          if (networkError?.name === "AbortError") throw networkError;
          last = new AIError("AI provider unreachable", 503);
          if (attempt < retries) {
            await sleep(600 * (attempt + 1));
            continue;
          }
          break;
        }

        if (response.ok) {
          const data = await response.json().catch(() => null);
          const text = extractAIText(data);
          if (text) {
            return { text, model, provider: provider.provider };
          }
          // Empty answer (e.g. reasoning consumed the whole budget) — try next model.
          console.error(`AI model ${model} returned an empty response; trying next model`);
          last = new AIError("The assistant could not produce an answer.", 502);
          break;
        }

        const bodyText = await response.text().catch(() => "");
        console.error(`AI ${provider.provider}/${model} error ${response.status}:`, bodyText.slice(0, 400));

        const transient = response.status === 429 || response.status >= 500;
        last = new AIError(
          response.status === 429
            ? "The assistant is busy right now. Please try again in a moment."
            : "The assistant is temporarily unavailable.",
          response.status,
        );

        if (transient && attempt < retries) {
          const retryAfter = Number(response.headers.get("retry-after")) || 0;
          await sleep(Math.max(retryAfter * 1000, 600 * (attempt + 1)));
          continue;
        }
        // Non-transient or out of attempts: roll over to the next model.
        break;
      }
    }
  }

  throw last ?? new AIError("AI request failed", 502);
}

/** Backwards-compatible alias. */
export const callDocAI = chatComplete;
