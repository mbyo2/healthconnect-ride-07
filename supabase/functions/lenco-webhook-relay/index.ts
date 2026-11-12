// Lenco webhook fan-out relay.
//
// The CEO's Lenco account exposes exactly ONE webhook URL field, but two
// apps consume Lenco events:
//   - Doc'O Clock  -> lenco-webhook (this project)
//   - BMaGlass Pay -> momo-webhook (paymentgetway project)
// This relay is the single URL registered in the Lenco dashboard. It
// forwards the RAW request body byte-identically to BOTH downstream
// webhooks, with the signature headers untouched.
//
// SECURITY MODEL: the relay verifies nothing and settles nothing. Each
// downstream webhook independently verifies the HMAC signature against
// its own configured secret and re-queries Lenco before settling, so a
// forged payload is rejected by both (401) exactly as if Lenco had sent
// it to them directly. The relay only reports the downstream statuses.
//
// Configure this URL in the Lenco dashboard (API & Webhooks):
//   https://tthzcijscedgxjfnfnky.supabase.co/functions/v1/lenco-webhook-relay

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-lenco-signature, x-webhook-signature, lenco-signature',
};

const DOWNSTREAMS = {
  doc_oclock: 'https://tthzcijscedgxjfnfnky.supabase.co/functions/v1/lenco-webhook',
  bmaglass: 'https://hhxwwozpvgktuqutfkhc.supabase.co/functions/v1/momo-webhook',
} as const;

// Signature header spellings Lenco / the downstream verifiers use.
const SIGNATURE_HEADERS = ['x-lenco-signature', 'x-webhook-signature', 'lenco-signature'] as const;

async function forward(url: string, body: string, headers: HeadersInit): Promise<number> {
  const res = await fetch(url, { method: 'POST', headers, body });
  // Drain the body so the connection completes cleanly; only the status matters.
  await res.text().catch(() => '');
  return res.status;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Byte-identical raw body — never parse/re-serialize, or the downstream
  // HMAC checks (computed over the exact bytes Lenco sent) would fail.
  const rawBody = await req.text();

  const forwardHeaders: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };
  for (const name of SIGNATURE_HEADERS) {
    const value = req.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  const attempts = await Promise.allSettled([
    forward(DOWNSTREAMS.doc_oclock, rawBody, forwardHeaders),
    forward(DOWNSTREAMS.bmaglass, rawBody, forwardHeaders),
  ]);

  const statusOf = (r: PromiseSettledResult<number>): number | null =>
    r.status === 'fulfilled' ? r.value : null;

  const forwarded = {
    doc_oclock: statusOf(attempts[0]),
    bmaglass: statusOf(attempts[1]),
  };

  // Any downstream HTTP response (even a 401 forgery rejection) proves the
  // fan-out reached that app — acknowledge Lenco with 200 so it does not
  // retry-storm. 502 only when BOTH fetch attempts threw (network-level
  // failure reaching either project).
  if (forwarded.doc_oclock === null && forwarded.bmaglass === null) {
    console.error('lenco-webhook-relay: both downstream forwards failed', attempts);
    return new Response(JSON.stringify({ received: false, forwarded }), {
      status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true, forwarded }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
