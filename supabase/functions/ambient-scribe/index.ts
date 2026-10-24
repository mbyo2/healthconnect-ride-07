// ambient-scribe — AI Ambient Scribe for consultations.
// Takes a consultation transcript and returns structured SOAP notes as DRAFT.
// Self-contained (dashboard edge-function editor is single-file): AI provider
// logic is inlined from supabase/functions/_shared/ai.ts.
// PATIENT SAFETY: output is always a draft requiring clinician review;
// the function never writes clinical records itself.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { aiRateLimitResponse } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// --- Inlined AI provider resolution (from _shared/ai.ts) ---
const AI_MODEL_CHAIN = [
  "inclusionai/ling-3.0-flash-sante:free",
  "inclusionai/ling-3.0-flash-vl:free",
  "thinkingmachines/inkling:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];
const AI_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function getProvider() {
  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (openRouterKey) return { endpoint: AI_ENDPOINT, models: AI_MODEL_CHAIN, headers: {
    "Authorization": `Bearer ${openRouterKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://doc0clock.online",
    "X-Title": "Doc' O Clock",
  }};
  const hfToken = Deno.env.get("HF_TOKEN");
  if (hfToken) return { endpoint: "https://api-inference.huggingface.co/v1/chat/completions", models: ["google/medgemma-1.5-4b-it"], headers: {
    "Authorization": `Bearer ${hfToken}`,
    "Content-Type": "application/json",
  }};
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return { endpoint: "https://ai.gateway.lovable.dev/v1/chat/completions", models: ["google/gemini-2.5-flash"], headers: {
    "Authorization": `Bearer ${lovableKey}`,
    "Content-Type": "application/json",
  }};
  return null;
}

function extractText(data: any): string {
  const msg = data?.choices?.[0]?.message;
  const content = msg?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("").trim();
    if (joined) return joined;
  }
  const reasoning = (typeof msg?.reasoning === "string" && msg.reasoning) || "";
  if (reasoning.trim()) return reasoning.trim();
  return "";
}

async function chatComplete(messages: any[], maxTokens = 1500): Promise<{ text: string; model: string }> {
  const provider = getProvider();
  if (!provider) throw new Error("AI service not configured. Set OPENROUTER_API_KEY in edge function secrets.");
  let lastErr: any = null;
  for (const model of provider.models) {
    try {
      const res = await fetch(provider.endpoint, {
        method: "POST",
        headers: provider.headers,
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2, stream: false }),
      });
      if (!res.ok) { lastErr = new Error(`AI provider error ${res.status}`); continue; }
      const data = await res.json();
      const text = extractText(data);
      if (text) return { text, model };
      lastErr = new Error("Empty AI response");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("AI request failed");
}
// --- End inlined AI logic ---

const requestSchema = z.object({
  transcript: z.string().min(20, 'Transcript too short').max(30000, 'Transcript too long'),
  patient_context: z.string().max(2000).optional().default(''),
});

const SYSTEM_PROMPT = `You are a clinical documentation assistant for Doc' O Clock. Convert the consultation transcript below into structured SOAP-format clinical notes.

CRITICAL RULES:
- Output ONLY valid JSON, no markdown fences, no commentary.
- Only include information actually present in the transcript. NEVER invent symptoms, diagnoses, medications, or measurements.
- If information is missing for a section, use an empty string or empty array.
- Flag uncertainty: if the transcript is unclear about something important, note it in "uncertainties".
- This is a DRAFT for clinician review, not a final record.

JSON schema:
{
  "subjective": "Patient-reported symptoms and history, as stated",
  "objective": "Observed/examined findings mentioned (vitals, exam results)",
  "assessment": "Clinician's stated impression/diagnosis, if mentioned",
  "plan": "Follow-up, prescriptions, referrals, tests mentioned",
  "key_symptoms": ["list of symptoms mentioned"],
  "medications_mentioned": ["list of medications mentioned"],
  "follow_up": "follow-up instructions mentioned, or empty string",
  "uncertainties": ["things that were unclear in the transcript"],
  "confidence": "high | medium | low — based on transcript clarity and completeness"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.substring('Bearer '.length).trim();
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      { auth: { persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rateLimited = await aiRateLimitResponse(user.id, 'ambient-scribe', 10, corsHeaders);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: parsed.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { transcript, patient_context } = parsed.data;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Patient context: ${patient_context || 'Not provided'}\n\nTRANSCRIPT:\n${transcript}\n\nGenerate the SOAP draft JSON now.` },
    ];
    const { text, model } = await chatComplete(messages, 1500);

    // Parse the JSON the model returned (strip any fences just in case)
    const cleaned = text.replace(/```json|```/g, '').trim();
    let notes: any;
    try {
      notes = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: 'AI returned invalid format', raw: text.slice(0, 2000) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      draft: notes,
      model,
      disclaimer: 'DRAFT — requires clinician review and approval before use as a clinical record.',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    const status = e?.message?.includes('not configured') ? 503 : 500;
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
