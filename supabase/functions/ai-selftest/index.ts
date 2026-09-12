import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAIProvider } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const provider = resolveAIProvider();
  if (!provider) {
    return new Response(JSON.stringify({ ok: false, reason: "no provider configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await fetch(provider.endpoint, {
    method: "POST",
    headers: provider.headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 20,
    }),
  });
  const text = await res.text();

  return new Response(
    JSON.stringify({
      provider: provider.provider,
      model: provider.model,
      endpoint: provider.endpoint,
      status: res.status,
      body: text.slice(0, 1000),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
