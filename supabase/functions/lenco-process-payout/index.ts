// Process approved withdrawal requests via Lenco disbursements.
// Called by admin after approving a withdrawal request.
// POST { withdrawal_id }
//
// Flow (ordering matters — money safety):
//   1. Validate the request is approved + admin-decided.
//   2. Idempotency: refuse if a transfer already exists for the reference.
//   3. CLAIM the withdrawal (approved -> processing) and write the payout
//      ledger row BEFORE any money moves — an earlier version initiated
//      the transfer first, so a crash between send and record left money
//      gone with no trace.
//   4. Initiate the Lenco transfer.
//   5. Synchronous 'successful' settles immediately via the shared
//      settleTransferByReference (paid + wallet debit). Anything else
//      stays 'processing' and is finished asynchronously by the
//      transfer.* webhook (or a manual status re-check) through the same
//      helper — one settlement path, no divergence.
//   6. A failed initiation reverts the claim (processing -> approved)
//      and marks the ledger row failed, so an admin can retry cleanly.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  initiateTransfer,
  checkTransferStatus,
  resolveBankId,
  settleTransferByReference,
  normalizePhone,
} from "../_shared/lenco.ts";

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
    // SECURITY: must have been approved by an admin (decided_by set), not self-approved
    if (!withdrawal.decided_by) throw new Error("Cannot pay: no admin approval recorded");

    const details = withdrawal.payout_details as any;
    const reference = `WD-${withdrawal.id.slice(0, 8).toUpperCase()}`;

    // Idempotency: never double-pay a reference that already exists at Lenco
    const existing = await checkTransferStatus(reference);
    if (existing.status !== "not_found" && existing.status !== "unknown") {
      throw new Error(`Transfer ${reference} already exists with status: ${existing.status}`);
    }

    // CLAIM FIRST (atomic): approved -> processing. Only one invocation wins.
    const { data: claimed } = await supabase
      .from("withdrawal_requests")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", withdrawal_id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    if (!claimed) {
      throw new Error("Withdrawal is no longer in approved state (may already be processing)");
    }

    // Ledger row BEFORE money moves (the webhook settler finds the
    // withdrawal through this row's metadata.withdrawal_id).
    const { error: ledgerError } = await supabase.from("lenco_payments").insert({
      user_id: withdrawal.provider_id,
      amount: withdrawal.amount,
      currency: withdrawal.currency || "ZMW",
      status: "processing",
      lenco_reference: reference,
      reference_type: "payout",
      reference_id: withdrawal_id,
      metadata: { withdrawal_id, payout_method: withdrawal.payout_method },
    });
    if (ledgerError) {
      // Without the ledger row the async settler cannot find this payout —
      // do not send money. Release the claim for a clean retry.
      await supabase
        .from("withdrawal_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", withdrawal_id)
        .eq("status", "processing");
      throw new Error(`Payout ledger creation failed: ${ledgerError.message}`);
    }

    const revertClaim = async (reason: string) => {
      await supabase
        .from("withdrawal_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", withdrawal_id)
        .eq("status", "processing");
      await supabase
        .from("lenco_payments")
        .update({ status: "failed", result_message: reason })
        .eq("lenco_reference", reference)
        .eq("reference_type", "payout");
    };

    // Initiate Lenco transfer (our keys, our account — provider just receives money)
    let result;
    if (withdrawal.payout_method === "mobile_money") {
      // Detect operator from phone prefix (Zambia — verified 2026-10-10).
      // Normalize first: stored numbers may be +260… international format,
      // whose digits would never match the local prefixes below.
      const phone = normalizePhone(details.phone_number);
      let operator: "mtn" | "airtel" | "zamtel" = "mtn";
      if (phone.startsWith("095")) operator = "zamtel";
      else if (phone.startsWith("096") || phone.startsWith("076")) operator = "mtn";
      else if (phone.startsWith("097") || phone.startsWith("077")) operator = "airtel";

      result = await initiateTransfer({
        amount: Number(withdrawal.amount),
        currency: withdrawal.currency || "ZMW",
        reference,
        phone: phone,
        operator,
        narration: `Doc'O Clock provider payout`,
      });
    } else {
      // Bank transfer: resolve the human bank name to Lenco's bank ID.
      const bankId = await resolveBankId(details.bank_name);
      result = await initiateTransfer({
        amount: Number(withdrawal.amount),
        currency: withdrawal.currency || "ZMW",
        reference,
        accountNumber: details.account_number,
        bankId,
        accountName: details.account_name,
        narration: `Doc'O Clock provider payout`,
      });
    }

    if (!result.success) {
      // Duplicate reference (errorCode 04) means it already went through —
      // check its real status before deciding.
      if (result.errorCode === "04") {
        const statusCheck = await checkTransferStatus(reference);
        if (statusCheck.status === "successful" || statusCheck.status === "pending") {
          result = { ...result, success: true, status: statusCheck.status, lencoReference: statusCheck.lencoReference };
        } else {
          await revertClaim(result.error || "Transfer failed");
          throw new Error(`Transfer failed: ${result.error}`);
        }
      } else {
        await revertClaim(result.error || "Transfer failed");
        throw new Error(result.error || "Transfer failed");
      }
    }

    // Record Lenco's own reference on the ledger row.
    if (result.lencoReference) {
      await supabase
        .from("lenco_payments")
        .update({ lenco_lenco_reference: result.lencoReference })
        .eq("lenco_reference", reference)
        .eq("reference_type", "payout");
    }

    // Synchronous success settles now (paid + wallet debit) through the
    // shared settler; a pending transfer is finished later by the webhook.
    let settled = false;
    if (result.status === "successful") {
      const outcome = await settleTransferByReference(supabase as any, reference);
      settled = outcome.settled;
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        lencoReference: result.lencoReference,
        status: settled ? "paid" : result.status,
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
