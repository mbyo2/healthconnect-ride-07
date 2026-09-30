const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAndSettleLenco } from '../_shared/lenco.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Authenticated: the frontend polls this after the customer approves
    // the collection on their phone.
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

    const url = new URL(req.url);
    let reference = url.searchParams.get('reference');
    if (!reference && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      reference = b.reference || null;
    }
    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ownership check: a user may only verify their own collections.
    const { data: owned } = await admin
      .from('lenco_payments')
      .select('id')
      .eq('lenco_reference', reference)
      .eq('user_id', userId)
      .maybeSingle();
    if (!owned) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { status, payment, settlement } = await verifyAndSettleLenco(admin as any, reference);

    return new Response(JSON.stringify({
      status, // paid | pending | failed | cancelled
      payment,
      settlement,
      message: status === 'paid'
        ? 'Payment confirmed. Your wallet has been credited.'
        : status === 'pending'
          ? 'Still waiting for approval on your phone. Approve the prompt, then check again.'
          : 'This payment did not complete. No money was taken from your wallet record.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('lenco-verify-payment error', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
