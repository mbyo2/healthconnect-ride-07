// Doc'O Clock AI Triage — Phase 3
// Accepts patient symptom intake, calls Lovable AI Gateway for a structured
// triage recommendation, persists a patient_triage_sessions row, and (for
// emergencies) auto-creates an emergency_events record. For non-emergencies
// it returns a shortlist of matching verified providers that the client can
// use to auto-book with one tap.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RequestSchema = z.object({
  chiefComplaint: z.string().min(3).max(500),
  symptoms: z.array(z.string().max(120)).max(30).default([]),
  duration: z.string().max(120).optional(),
  severity: z.number().int().min(0).max(10).optional(),
  extraNotes: z.string().max(2000).optional(),
  location: z
    .object({ latitude: z.number(), longitude: z.number() })
    .partial()
    .optional(),
});

type TriageOutput = {
  urgency: "emergency" | "urgent" | "routine" | "self_care";
  recommended_specialty: string;
  red_flags: string[];
  recommended_action: string;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are Doc'O Clock, a cautious clinical triage assistant.
Given a patient's symptoms, return a STRICT JSON object with fields:
  urgency: one of "emergency" | "urgent" | "routine" | "self_care"
  recommended_specialty: short specialty name in Title Case (e.g. "Cardiology", "General Practice")
  red_flags: string[] of concerning findings (empty array if none)
  recommended_action: short instruction for the patient
  reasoning: 1-3 sentence rationale

Rules:
- Prefer safety: if red flags for stroke, MI, sepsis, anaphylaxis, severe bleeding,
  suicidal ideation, severe SOB, or altered mental status are plausible, set urgency="emergency".
- "urgent" = same-day / within 24h clinician review.
- "routine" = book with a specialist in the coming days.
- "self_care" = safe home management with monitoring advice.
- Never diagnose definitively. Never invent data.
Respond with ONLY the JSON object, no prose, no code fences.`;

async function callGateway(userPayload: string): Promise<TriageOutput> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI rate limit");
  if (res.status === 402) throw new Error("AI credits exhausted");
  if (!res.ok) throw new Error(`AI gateway error: ${res.status}`);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI returned non-JSON response");
  }

  const urgency = ["emergency", "urgent", "routine", "self_care"].includes(
    parsed.urgency,
  )
    ? parsed.urgency
    : "routine";

  return {
    urgency,
    recommended_specialty:
      typeof parsed.recommended_specialty === "string" &&
      parsed.recommended_specialty.trim()
        ? parsed.recommended_specialty.trim()
        : "General Practice",
    red_flags: Array.isArray(parsed.red_flags)
      ? parsed.red_flags.filter((r: unknown) => typeof r === "string").slice(0, 12)
      : [],
    recommended_action:
      typeof parsed.recommended_action === "string"
        ? parsed.recommended_action
        : "Please consult a healthcare professional.",
    reasoning:
      typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const patientId = userData.user.id;

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const input = parsed.data;

    const userPayload = JSON.stringify({
      chief_complaint: input.chiefComplaint,
      symptoms: input.symptoms,
      duration: input.duration ?? null,
      severity_0_10: input.severity ?? null,
      extra_notes: input.extraNotes ?? null,
    });

    const ai = await callGateway(userPayload);

    // Service-role client to write across tables regardless of RLS surface.
    const admin = createClient(supabaseUrl, serviceKey);

    // Emergency handling: create emergency_event first so we can link it.
    let emergencyEventId: string | null = null;
    if (ai.urgency === "emergency") {
      const { data: ev, error: evErr } = await admin
        .from("emergency_events")
        .insert({
          patient_id: patientId,
          status: "active",
          message: `AI triage flagged EMERGENCY. Complaint: ${input.chiefComplaint}. ${ai.reasoning}`,
          latitude: input.location?.latitude ?? null,
          longitude: input.location?.longitude ?? null,
        })
        .select("id")
        .single();
      if (!evErr && ev) emergencyEventId = ev.id;
    }

    const { data: session, error: sessErr } = await admin
      .from("patient_triage_sessions")
      .insert({
        patient_id: patientId,
        chief_complaint: input.chiefComplaint,
        symptoms: input.symptoms,
        duration: input.duration ?? null,
        severity: input.severity ?? null,
        extra_notes: input.extraNotes ?? null,
        urgency: ai.urgency,
        recommended_specialty: ai.recommended_specialty,
        red_flags: ai.red_flags,
        recommended_action: ai.recommended_action,
        reasoning: ai.reasoning,
        model: "google/gemini-3-flash-preview",
        emergency_event_id: emergencyEventId,
      })
      .select("id")
      .single();

    if (sessErr) throw sessErr;

    // For non-emergencies, look up a shortlist of verified providers by specialty.
    let providers: Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      specialty: string | null;
      rating: number | null;
      city: string | null;
    }> = [];

    if (ai.urgency !== "emergency") {
      const { data: provs } = await admin
        .from("profiles")
        .select("id, first_name, last_name, specialty, rating, city")
        .eq("is_verified", true)
        .eq("accepting_patients", true)
        .ilike("specialty", `%${ai.recommended_specialty}%`)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(5);
      providers = provs ?? [];
    }

    return new Response(
      JSON.stringify({
        session_id: session.id,
        urgency: ai.urgency,
        recommended_specialty: ai.recommended_specialty,
        red_flags: ai.red_flags,
        recommended_action: ai.recommended_action,
        reasoning: ai.reasoning,
        emergency_event_id: emergencyEventId,
        providers,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("triage-assess error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    // Sanitize: never leak stack traces or provider errors to client.
    const safe =
      message.startsWith("AI ") || message === "Unauthorized"
        ? message
        : "Triage service temporarily unavailable";
    return new Response(JSON.stringify({ error: safe }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
