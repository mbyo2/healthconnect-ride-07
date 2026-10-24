const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAndSettleLenco, verifyWebhookSignature, settleTransferByReference } from '../_shared/lenco.ts';

// Lenco webhook receiver.
//
// SECURITY MODEL: the webhook payload is never trusted on its own. We
// verify the HMAC signature, then re-query Lenco's status API for the
// reference and only settle when Lenco itself reports 'successful'. A
// forged or replayed webhook therefore cannot credit any wallet.
// FAIL CLOSED (P2-25): if neither LENCO_WEBHOOK_SECRET nor
// LENCO_SECRET_KEY is configured there is nothing to verify a signature
// against, so every POST is refused with 503 until the Lenco keys land.
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

  // Fail closed (P2-25): verifyWebhookSignature derives its candidate keys
  // from LENCO_WEBHOOK_SECRET and LENCO_SECRET_KEY (official spec: HMAC
  // key = SHA256 of the API token). With neither configured, verification
  // cannot be performed at all — refuse before touching the payload.
  // (Outside the try/catch below: that catch returns 200 to stop retry
  // storms, and a not-configured refusal must not be masked as success.)
  if (!Deno.env.get('LENCO_WEBHOOK_SECRET') && !Deno.env.get('LENCO_SECRET_KEY')) {
    console.error('lenco-webhook: no Lenco webhook secret/API key configured — refusing POST');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Lenco event envelope: { event: '<name>', data: { ... } }.
    // our reference is always the merchant-supplied one.
    const eventName: string = String(payload?.event || '');
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

    // Route by event family. Transfer events complete/reverse WITHDRAWALS
    // via the transfers status API — routing them into the collections
    // lookup (the old behaviour) meant async payouts never settled.
    if (eventName.startsWith('transfer.')) {
      const outcome = await settleTransferByReference(admin as any, reference);
      return new Response(JSON.stringify({ ok: true, ...outcome }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Collections: re-query Lenco (authoritative), settle only on 'successful'.
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
