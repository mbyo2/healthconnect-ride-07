import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DPO_API_URL = Deno.env.get('DPO_API_URL') || 'https://secure.3gdirectpay.com/API/v6/';
const DPO_COMPANY_TOKEN = Deno.env.get('DPO_COMPANY_TOKEN')!;

function xmlEscape(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Public endpoint (DPO redirects users back without auth). We only look up by trans_token.
    const url = new URL(req.url);
    let transToken = url.searchParams.get('TransactionToken') || url.searchParams.get('trans_token');
    if (!transToken && (req.method === 'POST')) {
      const b = await req.json().catch(() => ({}));
      transToken = b.trans_token || b.TransactionToken || null;
    }
    if (!transToken) {
      return new Response(JSON.stringify({ error: 'Missing trans_token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(DPO_COMPANY_TOKEN)}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${xmlEscape(transToken)}</TransactionToken>
</API3G>`;

    const dpoRes = await fetch(DPO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
    const dpoText = await dpoRes.text();
    const result = extractTag(dpoText, 'Result');
    const resultExplanation = extractTag(dpoText, 'ResultExplanation');

    // 000 = paid, 900 = not paid yet, 901 = declined, others = various states
    let status: 'paid' | 'pending' | 'failed' | 'cancelled' = 'pending';
    if (result === '000') status = 'paid';
    else if (result === '901' || result === '904') status = 'failed';
    else if (result === '902') status = 'cancelled';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: updated } = await admin
      .from('dpo_payments')
      .update({
        status,
        result_code: result,
        result_explanation: resultExplanation,
      })
      .eq('trans_token', transToken)
      .select()
      .maybeSingle();

    return new Response(JSON.stringify({
      status,
      code: result,
      message: resultExplanation,
      payment: updated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('dpo-verify-token error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
