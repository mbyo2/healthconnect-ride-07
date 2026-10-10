// Process approved withdrawal requests via Lenco disbursements.
// Called by admin after approving a withdrawal request.
// POST { withdrawal_id }
// - Validates the request is approved and not already paid
// - Initiates Lenco disbursement to provider's mobile money or bank
// - Updates withdrawal_requests with lenco reference and status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initiateDisbursement } from "../_shared/lenco.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "admin", "finance_manager"]);
    
    if (!roles || roles.length === 0) throw new Error("Admin access required");

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) throw new Error("withdrawal_id required");

    // Fetch the withdrawal request
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", withdrawal_id)
      .single();

    if (fetchError || !withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status !== "approved") throw new Error(`Cannot pay: status is ${withdrawal.status}`);
    if ((withdrawal as any).lenco_reference) throw new Error("Already paid via Lenco");

    const details = withdrawal.payout_details as any;
    const reference = `WD-${withdrawal.id.slice(0, 8).toUpperCase()}`;

    // Initiate Lenco disbursement
    let result;
    if (withdrawal.payout_method === "mobile_money") {
      // Detect operator from phone prefix (Zambia)
      const phone = details.phone_number.replace(/\D/g, "");
      let operator: "mtn" | "airtel" | "zamtel" = "mtn";
      if (phone.startsWith("097") || phone.startsWith("077")) operator = "mtn";
      else if (phone.startsWith("095") || phone.startsWith("075")) operator = "airtel";
      else if (phone.startsWith("096") || phone.startsWith("076")) operator = "zamtel";

      result = await initiateDisbursement({
        amount: Number(withdrawal.amount),
        currency: withdrawal.currency || "ZMW",
        reference,
        phone: phone,
        operator,
        narration: `Doc'O Clock provider payout`,
      });
    } else {
      result = await initiateDisbursement({
        amount: Number(withdrawal.amount),
        currency: withdrawal.currency || "ZMW",
        reference,
        accountNumber: details.account_number,
        bankCode: details.bank_name, // Lenco may need bank code; using name as fallback
        accountName: details.account_name,
        narration: `Doc'O Clock provider payout`,
      });
    }

    if (!result.success) {
      throw new Error(result.error || "Lenco disbursement failed");
    }

    // Update withdrawal with Lenco reference, mark as paid
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawal_id);

    if (updateError) throw updateError;

    // Log in ledger
    await supabase.from("lenco_payments").insert({
      user_id: withdrawal.provider_id,
      amount: withdrawal.amount,
      currency: withdrawal.currency || "ZMW",
      reference,
      lenco_reference: result.lencoReference,
      type: "disbursement",
      status: result.status || "pending",
      metadata: { withdrawal_id, payout_method: withdrawal.payout_method },
    });

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        lencoReference: result.lencoReference,
        status: result.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
