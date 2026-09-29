import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAndSettleLenco, verifyWebhookSignature } from '../_shared/lenco.ts';

// Lenco webhook receiver.
//
// SECURITY MODEL: the webhook payload is never trusted on its own. We
// verify the HMAC signature when LENCO_WEBHOOK_SECRET is configured, then
// re-query Lenco's status API for the reference and only settle when Lenco
// itself reports 'successful'. A forged or replayed webhook therefore
// cannot credit any wallet.
//
// Configure the webhook URL in the Lenco dashboard (API & Webhooks):
//   https://<project-ref>.supabase.co/functions/v1/lenco-webhook

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-lenco-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('lenco-signature');

    const sigOk = await verifyWebhookSignature(rawBody, signature);
    if (!sigOk) {
      console.warn('lenco-webhook: signature verification failed');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let payload: any = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lenco nests the collection under data / event.data depending on version;
    // our reference is always the merchant-supplied one.
    const data = payload?.data ?? payload?.event?.data ?? payload;
    const reference: string | null =
      data?.reference || data?.merchantReference || payload?.reference || null;
    if (!reference) {
      console.warn('lenco-webhook: no reference in payload');
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Re-query Lenco (authoritative) and settle only on 'successful'.
    const { status, settlement } = await verifyAndSettleLenco(admin as any, reference);

    return new Response(JSON.stringify({ ok: true, status, settled: !!(settlement as any)?.settled }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('lenco-webhook error', e);
    // Return 200 anyway so Lenco does not retry-storm a poisoned payload;
    // the failure is in our logs and the frontend verify path still works.
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
