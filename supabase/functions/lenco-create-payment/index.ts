const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};
import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveReferenceAmount, assertTrustedAmount, PriceMismatchError } from '../_shared/price-guard.ts';
import { initiateMobileMoneyCollection, normalizePhone, type LencoOperator } from '../_shared/lenco.ts';
import { aiRateLimitResponse } from '../_shared/rate-limit.ts';

const ALLOWED_OPERATORS: LencoOperator[] = ['mtn', 'airtel', 'zamtel', 'tnm'];

function sanitizeReference(s: string): string {
  // Lenco only allows -, ., _ and alphanumerics in references.
  return s.replace(/[^a-zA-Z0-9\-._]/g, '').slice(0, 64);
}

/**
 * Resolve the institution behind a payment reference, for payment_mode gating.
 * Returns the institution ID or null if not applicable / not found.
 */
async function resolveInstitutionForReference(admin: any, referenceType: string, referenceId: string): Promise<string | null> {
  const type = referenceType.toLowerCase();
  try {
    if (type === "invoice") {
      const { data } = await admin.from("billing_invoices").select("institution_id").eq("id", referenceId).maybeSingle();
      return data?.institution_id || null;
    }
    if (type === "pharmacy_sale" || type === "order") {
      const { data } = await admin.from("orders").select("pharmacy_id").eq("id", referenceId).maybeSingle();
      if (!data?.pharmacy_id) return null;
      const { data: inst } = await admin.from("healthcare_institutions").select("id").eq("id", data.pharmacy_id).maybeSingle();
      return inst?.id || null;
    }
    if (type === "appointment" || type === "booking_fee") {
      // booking_fee → appointment → institution
      let appointmentId = referenceId;
      if (type === "booking_fee") {
        const { data } = await admin.from("booking_fees").select("appointment_id").eq("id", referenceId).maybeSingle();
        if (!data?.appointment_id) return null;
        appointmentId = data.appointment_id;
      }
      const { data } = await admin.from("appointments").select("institution_id").eq("id", appointmentId).maybeSingle();
      return data?.institution_id || null;
    }
  } catch {
    return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) || '';

    // M-5 (security sweep 2026-11-10): per-user rate limit. Each call
    // initiates a real Lenco collection + phone prompt, so unbounded
    // calls are prompt spam against the caller's own number and load
    // against the provider. Same shared Postgres limiter as doc-chat.
    const rateLimited = await aiRateLimitResponse(userId, 'lenco-create-payment', 10, corsHeaders);
    if (rateLimited) return rateLimited;

    const body = await req.json().catch(() => ({}));
    const clientAmount = Number(body.amount);
    // Platform prices and Lenco mobile money collections are ZMW only
    const currency = 'ZMW';
    const referenceType = String(body.reference_type || 'wallet_topup');
    const referenceId = body.reference_id || null;
    const description = String(body.description || 'D0C Health payment').slice(0, 100);
    const phone = normalizePhone(String(body.phone || ''));
    const operator = String(body.operator || 'mtn').toLowerCase() as LencoOperator;
    const country = String(body.country || 'zm').toLowerCase();

    if (!clientAmount || clientAmount <= 0 || !Number.isFinite(clientAmount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      return new Response(JSON.stringify({ error: 'A valid mobile-money phone number is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!ALLOWED_OPERATORS.includes(operator)) {
      return new Response(JSON.stringify({ error: `Unsupported operator. Use one of: ${ALLOWED_OPERATORS.join(', ')}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // L-6 (security sweep 2026-11-10) — DELIBERATE, DOCUMENTED: this
    // function does NOT verify the caller owns the reference
    // (invoice / order / appointment). Paying someone else's bill is
    // the intended behaviour — "pay on behalf" (e.g. family paying a
    // relative's invoice; nursing-home family billing). It is safe by
    // construction: the money leaves the CALLER's own mobile-money
    // account (their phone approves the prompt), the caller can only
    // verify/settle their own collections (lenco-verify-payment
    // 404s for other users' references), and paying another person's
    // bill can only settle that person's debt — it cannot extract
    // money from them. Do NOT add an ownership check here without a
    // CEO decision: it would break family payments.
    //
    // ── PAYMENT MODE GATE ──────────────────────────────────────────
    // If this payment is for an institution in 'own' (HMS-only) mode,
    // reject it — their patients pay the facility directly, never via us.
    // Allowed through: wallet_topup (patient's own wallet), subscription (platform revenue).
    const gatedTypes = new Set(["invoice", "pharmacy_sale", "booking_fee", "appointment", "consultation"]);
    if (gatedTypes.has(referenceType.toLowerCase()) && referenceId) {
      const institutionId = await resolveInstitutionForReference(admin as any, referenceType, referenceId);
      if (institutionId) {
        const { data: inst } = await admin
          .from("healthcare_institutions")
          .select("payment_mode")
          .eq("id", institutionId)
          .maybeSingle();
        if (inst?.payment_mode === "own") {
          return new Response(
            JSON.stringify({ error: "This facility handles its own payments. Please pay them directly." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Resolve the authoritative amount server-side. Wallet top-ups are
    // self-funding so the user-chosen amount is allowed there only.
    let amount: number;
    try {
      const trusted = await resolveReferenceAmount(admin as any, referenceType, referenceId);
      amount = assertTrustedAmount(clientAmount, trusted, referenceType === 'wallet_topup');
    } catch (e) {
      if (e instanceof PriceMismatchError) {
        return new Response(
          JSON.stringify({ error: 'Payment amount does not match the authoritative price', expectedAmount: e.expected }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }

    const lencoReference = sanitizeReference(`D0C-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);

    let collection;
    try {
      collection = await initiateMobileMoneyCollection({
        amount,
        currency,
        reference: lencoReference,
        phone,
        operator,
        country,
        bearer: 'merchant',
      });
    } catch (e: any) {
      // L-1: never surface the provider's raw error text to the client —
      // it can carry gateway internals. Detail stays in the server log.
      console.error('Lenco initiate collection failed', e?.message || e);
      return new Response(JSON.stringify({ error: 'Mobile money provider error', message: 'Could not start the mobile money payment. Please try again.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lencoStatus = String(collection.status || 'pending').toLowerCase();
    // 'pending' (created, prompt not yet pushed) stays distinct from
    // 'pay-offline' (prompt on the customer's phone, awaiting approval) —
    // collapsing them hid collections that never reached the customer.
    const status = lencoStatus === 'successful' ? 'paid'
      : lencoStatus === 'failed' ? 'failed'
      : lencoStatus === 'pending' ? 'pending'
      : 'pay_offline';

    const { data: inserted, error: insErr } = await admin.from('lenco_payments').insert({
      user_id: userId,
      reference_type: referenceType,
      reference_id: referenceId,
      amount,
      currency,
      status,
      lenco_reference: lencoReference,
      lenco_collection_id: collection.id || null,
      lenco_lenco_reference: collection.lencoReference || null,
      operator,
      phone,
      country,
      result_message: collection.status || null,
      metadata: {
        description,
        email: userEmail,
        account_name: collection.mobileMoneyDetails?.accountName ?? null,
      },
    }).select().single();

    if (insErr) {
      console.error('Insert lenco_payments failed', insErr);
      // Fail loudly: a Lenco collection without a platform record can never
      // be verified or settled, so the payer's wallet would never be credited.
      return new Response(JSON.stringify({ error: 'Payment record creation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      reference: lencoReference,
      collection_id: collection.id || null,
      status,
      lenco_status: collection.status || null,
      account_name: collection.mobileMoneyDetails?.accountName ?? null,
      payment_id: inserted?.id,
      // UX copy: Lenco pushes an authorization prompt to the customer's phone.
      message: status === 'pay_offline' || status === 'pending'
        ? `Approve the K${amount.toFixed(2)} payment on your ${operator.toUpperCase()} phone, then tap "I've approved".`
        : 'Payment initiated.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    // L-1: never surface raw system error text to the client.
    console.error('lenco-create-payment error', e);
    return new Response(JSON.stringify({ error: 'Could not start the payment. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
