// send-messages: drains the message_queue outbox (SMS / WhatsApp).
//
// Providers (env-driven, secrets-only swap like the payment gateways):
//   Primary:  Africa's Talking — best Zambia coverage (MTN/Airtel/Zamtel)
//     AT_API_KEY, AT_USERNAME, AT_SENDER_ID (default DOCOCLOCK)
//   Fallback: Twilio
//     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM
//
// Invoke on a schedule (pg_cron / external cron) or manually:
//   POST /functions/v1/send-messages  { "batch": 50 }
// Auth: requires the service-role key or a valid cron secret header
//   x-cron-secret: $CRON_SECRET (when set).
//
// Safety: messages are claimed atomically (status queued -> sending) so
// concurrent invocations cannot double-send. Failed sends retry up to
// 3 attempts, then stay 'failed' with last_error for audit.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface QueuedMessage {
  id: string;
  phone_number: string;
  channel: 'sms' | 'whatsapp' | 'email';
  message_body: string;
  attempts: number;
  institution_id: string | null;
}

async function sendViaAfricasTalking(
  msg: QueuedMessage,
  senderId: string,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const apiKey = Deno.env.get('AT_API_KEY');
  const username = Deno.env.get('AT_USERNAME');
  if (!apiKey || !username) return { ok: false, error: 'AT not configured' };

  if (msg.channel === 'whatsapp') {
    // Africa's Talking WhatsApp API
    const res = await fetch('https://whatsapp.africastalking.com/v1/send', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username,
        phoneNumber: msg.phone_number,
        body: msg.message_body,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `AT WhatsApp ${res.status}: ${JSON.stringify(json)}` };
    return { ok: true, providerId: json?.messageId || json?.id };
  }

  // SMS
  const form = new URLSearchParams({
    username,
    to: msg.phone_number,
    message: msg.message_body,
    from: senderId,
  });
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  const recipients = json?.SMSMessageData?.Recipients || [];
  const first = recipients[0];
  if (!res.ok || !first || (first.statusCode && first.statusCode >= 400)) {
    return { ok: false, error: `AT SMS ${res.status}: ${first?.status || JSON.stringify(json)}` };
  }
  return { ok: true, providerId: first.messageId };
}

async function sendViaTwilio(
  msg: QueuedMessage,
): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!sid || !token) return { ok: false, error: 'Twilio not configured' };

  const from =
    msg.channel === 'whatsapp'
      ? Deno.env.get('TWILIO_WHATSAPP_FROM')
      : Deno.env.get('TWILIO_SMS_FROM');
  if (!from) return { ok: false, error: `Twilio ${msg.channel} sender not configured` };

  const to = msg.channel === 'whatsapp' ? `whatsapp:${msg.phone_number}` : msg.phone_number;
  const form = new URLSearchParams({ From: from, To: to, Body: msg.message_body });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${json?.message || 'unknown'}` };
  return { ok: true, providerId: json?.sid };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Auth: cron secret OR service-role bearer
  const cronSecret = Deno.env.get('CRON_SECRET');
  const providedSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const authorized =
    (cronSecret && providedSecret === cronSecret) ||
    (serviceKey && authHeader === `Bearer ${serviceKey}`);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  );

  let batch = 50;
  try {
    const body = await req.json();
    if (body?.batch) batch = Math.min(Number(body.batch) || 50, 200);
  } catch {
    /* default batch */
  }

  // Claim due messages: queued and scheduled_for <= now
  const { data: due, error: fetchError } = await supabase
    .from('message_queue')
    .select('id, phone_number, channel, message_body, attempts, institution_id')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_for', { ascending: true })
    .limit(batch);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const msg of (due || []) as QueuedMessage[]) {
    // Email is handled by the Resend-based email system, not here
    if (msg.channel === 'email') {
      results.skipped++;
      continue;
    }

    // Atomic claim
    const { data: claimed } = await supabase
      .from('message_queue')
      .update({ status: 'sending' })
      .eq('id', msg.id)
      .eq('status', 'queued')
      .select('id');
    if (!claimed || claimed.length === 0) {
      results.skipped++;
      continue;
    }

    // Sender ID from institution settings (fallback env / default)
    let senderId = Deno.env.get('AT_SENDER_ID') || 'DOCOCLOCK';
    if (msg.institution_id) {
      const { data: settings } = await supabase
        .from('institution_reminder_settings')
        .select('sms_sender_id')
        .eq('institution_id', msg.institution_id)
        .maybeSingle();
      if ((settings as any)?.sms_sender_id) senderId = (settings as any).sms_sender_id;
    }

    // Primary: Africa's Talking. Fallback: Twilio.
    let attempt = await sendViaAfricasTalking(msg, senderId);
    let provider = 'africas_talking';
    if (!attempt.ok) {
      const twilioAttempt = await sendViaTwilio(msg);
      if (twilioAttempt.ok) {
        attempt = twilioAttempt;
        provider = 'twilio';
      }
    }

    if (attempt.ok) {
      await supabase
        .from('message_queue')
        .update({
          status: 'sent',
          provider,
          provider_message_id: attempt.providerId || null,
          sent_at: new Date().toISOString(),
          attempts: msg.attempts + 1,
        })
        .eq('id', msg.id);
      results.sent++;
    } else {
      const exhausted = msg.attempts + 1 >= 3;
      await supabase
        .from('message_queue')
        .update({
          status: exhausted ? 'failed' : 'queued',
          attempts: msg.attempts + 1,
          last_error: attempt.error || 'unknown error',
        })
        .eq('id', msg.id);
      results.failed++;
    }
  }

  return new Response(JSON.stringify({ processed: (due || []).length, ...results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
