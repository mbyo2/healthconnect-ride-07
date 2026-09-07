/**
 * Doc' O Clock AI — single source of truth for the model used by every AI
 * edge function in this project.
 *
 * Primary provider: OpenRouter (OpenAI-compatible chat completions).
 * Fallback provider: HuggingFace inference (kept so the app keeps answering
 * if the OpenRouter key is missing or the model is temporarily unavailable).
 *
 * Bump AI_MODEL here and every AI function follows.
 */

export const AI_MODEL = "inclusionai/ling-3.0-flash-sante:free";

/** Short label returned to clients in API responses. */
export const AI_MODEL_LABEL = "Doc' O Clock AI";

/** OpenAI-compatible chat completions endpoint on OpenRouter. */
export const AI_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** Fallback model + endpoint (HuggingFace) if OpenRouter is not configured. */
export const FALLBACK_MODEL = "google/medgemma-1.5-4b-it";
export const FALLBACK_ENDPOINT = "https://api-inference.huggingface.co/v1/chat/completions";

export interface AIProvider {
  endpoint: string;
  model: string;
  headers: Record<string, string>;
  provider: "openrouter" | "huggingface";
}

/**
 * Resolves the AI provider to use. Prefers OpenRouter; falls back to
 * HuggingFace when OPENROUTER_API_KEY is not set. Returns null when neither
 * provider is configured so callers can return a clear 503.
 */
export function resolveAIProvider(): AIProvider | null {
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) {
    return {
      endpoint: AI_ENDPOINT,
      model: AI_MODEL,
      provider: "openrouter",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        // OpenRouter attribution headers.
        "HTTP-Referer": "https://doc0clock.online",
        "X-Title": "Doc' O Clock",
      },
    };
  }

  const hfToken = Deno.env.get("HF_TOKEN");
  if (hfToken) {
    return {
      endpoint: FALLBACK_ENDPOINT,
      model: FALLBACK_MODEL,
      provider: "huggingface",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
    };
  }

  return null;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: unknown;
}

export interface CallAIOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Number of retry attempts for transient failures (429 / 5xx). */
  retries?: number;
}

export interface CallAIResult {
  text: string;
  model: string;
  provider: string;
}

/**
 * Calls the AI provider and returns the assistant text.
 * Retries only on transient statuses, with bounded backoff.
 * Throws an Error carrying `status` for terminal failures.
 */
export async function callDocAI(options: CallAIOptions): Promise<CallAIResult> {
  const provider = resolveAIProvider();
  if (!provider) {
    const err = new Error(
      "AI service not configured. Set OPENROUTER_API_KEY (or HF_TOKEN) in edge function secrets.",
    ) as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  const retries = options.retries ?? 2;
  let lastError: (Error & { status?: number }) | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Response;
    try {
      response = await fetch(provider.endpoint, {
        method: "POST",
        headers: provider.headers,
        body: JSON.stringify({
          model: provider.model,
          messages: options.messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.3,
        }),
      });
    } catch (networkError) {
      lastError = new Error("AI provider unreachable") as Error & { status?: number };
      lastError.status = 503;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      const data = await response.json();
      const text =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "";
      if (!text) {
        const err = new Error("AI provider returned an empty response") as Error & { status?: number };
        err.status = 502;
        throw err;
      }
      return { text, model: provider.model, provider: provider.provider };
    }

    const bodyText = await response.text().catch(() => "");
    console.error(`AI provider error ${response.status}:`, bodyText.slice(0, 500));

    const transient = response.status === 429 || response.status >= 500;
    lastError = new Error(
      response.status === 429
        ? "The assistant is busy right now. Please try again in a moment."
        : "The assistant is temporarily unavailable.",
    ) as Error & { status?: number };
    lastError.status = response.status;

    if (transient && attempt < retries) {
      const retryAfter = Number(response.headers.get("retry-after")) || 0;
      await new Promise((r) => setTimeout(r, Math.max(retryAfter * 1000, 800 * (attempt + 1))));
      continue;
    }
    throw lastError;
  }

  throw lastError ?? new Error("AI request failed");
}
