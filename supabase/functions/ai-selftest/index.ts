import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatComplete } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Diagnostic endpoint: verifies the AI provider chain end-to-end without
 * touching patient data. Returns which provider/model answered.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const result = await chatComplete({
      messages: [
        { role: "system", content: "You are a medical assistant. Answer in one short sentence." },
        { role: "user", content: "Name one common symptom of dehydration." },
      ],
      maxTokens: 400,
    });
    return new Response(
      JSON.stringify({ ok: true, provider: result.provider, model: result.model, text: result.text.slice(0, 300) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, status: error?.status ?? 500, message: error?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
