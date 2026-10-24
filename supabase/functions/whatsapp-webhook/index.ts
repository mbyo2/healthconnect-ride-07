// whatsapp-webhook: receives Meta WhatsApp Cloud API webhooks.
//
// GET  — Meta's verification handshake (hub.mode / hub.verify_token /
//        hub.challenge) checked against WHATSAPP_VERIFY_TOKEN.
// POST — delivery status events for messages we sent: updates the
//        message_queue row matched by provider_message_id
//        (sent -> delivered / failed with Meta's error title).
//        The X-Hub-Signature-256 HMAC is verified against
//        WHATSAPP_APP_SECRET before any update is applied. FAIL CLOSED
//        (P2-24): if WHATSAPP_APP_SECRET is not configured, POSTs are
//        refused with 503 — an unverifiable webhook is never processed.
//
// Configure in the Meta app: callback URL = <project>/functions/v1/whatsapp-webhook,
// verify token = WHATSAPP_VERIFY_TOKEN, subscribe to the `messages` field.

import { createClient } from 'npm:@supabase/supabase-js@2';

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature.slice('sha256='.length);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge || '', { status: 200 });
    }
    return new Response('Verification failed', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const appSecret = Deno.env.get('WHATSAPP_APP_SECRET');
  if (!appSecret) {
    // Fail closed (P2-24): without the app secret a POST cannot be proven
    // to come from Meta, so refuse it outright instead of processing
    // unverified status events.
    console.error('whatsapp-webhook: WHATSAPP_APP_SECRET not configured — refusing POST');
    return new Response('Webhook not configured', { status: 503 });
  }
  const ok = await verifySignature(rawBody, req.headers.get('x-hub-signature-256'), appSecret);
  if (!ok) return new Response('Invalid signature', { status: 401 });

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const changes = payload?.entry?.[0]?.changes || [];
  for (const change of changes) {
    const statuses = change?.value?.statuses || [];
    for (const st of statuses) {
      const providerId = st.id;
      if (!providerId) continue;
      if (st.status === 'delivered' || st.status === 'read') {
        await supabase
          .from('message_queue')
          .update({ status: 'delivered', delivered_at: new Date().toISOString() })
          .eq('provider_message_id', providerId)
          .eq('status', 'sent');
      } else if (st.status === 'failed') {
        const errText = st.errors?.[0]
          ? `${st.errors[0].title || 'failed'} (${st.errors[0].code || '?'})`
          : 'WhatsApp delivery failed';
        await supabase
          .from('message_queue')
          .update({ status: 'failed', last_error: errText })
          .eq('provider_message_id', providerId)
          .in('status', ['sent', 'sending']);
      }
    }
  }

  // Meta expects a fast 200 regardless of payload content.
  return new Response('OK', { status: 200 });
});
