// Initialize a Lenco widget payment: creates the pending lenco_payments row
// (service_role, bypassing RLS) so the verify step can find and settle it.
// The widget then collects directly via Lenco's hosted checkout.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { reference, amount, currency = "ZMW", reference_type = "wallet_topup", reference_id = null, description = "" } = body;

    if (!reference || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "reference and positive amount required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only wallet_topup is allowed via widget for now (patient self-funding)
    if (reference_type !== "wallet_topup") {
      return new Response(JSON.stringify({ error: "Only wallet top-ups supported via widget" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insertErr } = await supabase.from("lenco_payments").insert({
      user_id: user.id,
      reference_type,
      reference_id,
      amount,
      currency,
      status: "pending",
      lenco_reference: reference, // our reference sent to the widget
      metadata: { description, source: "widget" },
    });

    if (insertErr) {
      // Duplicate reference = already initialized, that's fine (idempotent)
      if (!insertErr.message?.includes("duplicate") && (insertErr as any)?.code !== "23505") {
        throw insertErr;
      }
    }

    return new Response(JSON.stringify({ success: true, reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("lenco-widget-init error:", e.message);
    return new Response(JSON.stringify({ error: "Failed to initialize payment" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
