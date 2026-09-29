import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveReferenceAmount, assertTrustedAmount, PriceMismatchError } from '../_shared/price-guard.ts';
import { initiateMobileMoneyCollection, normalizePhone, type LencoOperator } from '../_shared/lenco.ts';

const ALLOWED_OPERATORS: LencoOperator[] = ['mtn', 'airtel', 'zamtel', 'tnm'];

function sanitizeReference(s: string): string {
  // Lenco only allows -, ., _ and alphanumerics in references.
  return s.replace(/[^a-zA-Z0-9\-._]/g, '').slice(0, 64);
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

    const body = await req.json().catch(() => ({}));
    const clientAmount = Number(body.amount);
    const currency = String(body.currency || 'ZMW').toUpperCase();
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
      console.error('Lenco initiate collection failed', e?.message || e);
      return new Response(JSON.stringify({ error: 'Mobile money provider error', message: e?.message || 'Failed to start collection' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lencoStatus = String(collection.status || 'pending').toLowerCase();
    const status = lencoStatus === 'successful' ? 'paid' : lencoStatus === 'failed' ? 'failed' : 'pay_offline';

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
      message: status === 'pay_offline'
        ? `Approve the K${amount.toFixed(2)} payment on your ${operator.toUpperCase()} phone, then tap "I've approved".`
        : 'Payment initiated.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('lenco-create-payment error', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
