import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const DPO_API_URL = Deno.env.get('DPO_API_URL') || 'https://secure.3gdirectpay.com/API/v6/';
const DPO_PAYMENT_URL = Deno.env.get('DPO_PAYMENT_URL') || 'https://secure.3gdirectpay.com/payv3.php';
const DPO_COMPANY_TOKEN = Deno.env.get('DPO_COMPANY_TOKEN')!;
const DPO_SERVICE_TYPE = Deno.env.get('DPO_SERVICE_TYPE') || '54841';

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
    const amount = Number(body.amount);
    const currency = String(body.currency || 'ZMW').toUpperCase();
    const referenceType = String(body.reference_type || 'booking_fee');
    const referenceId = body.reference_id || null;
    const description = String(body.description || 'D0C Health payment').slice(0, 100);
    const redirectUrl = String(body.redirect_url || `${req.headers.get('origin') || ''}/payment-return`);
    const backUrl = String(body.back_url || `${req.headers.get('origin') || ''}/payment-cancelled`);
    const customerFirstName = String(body.customer_first_name || '').slice(0, 40);
    const customerLastName = String(body.customer_last_name || '').slice(0, 40);
    const customerPhone = String(body.customer_phone || '').slice(0, 20);

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const transRef = `D0C-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const nowUtc = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const paymentDate = `${nowUtc.getUTCFullYear()}/${pad(nowUtc.getUTCMonth() + 1)}/${pad(nowUtc.getUTCDate()) } ${pad(nowUtc.getUTCHours())}:${pad(nowUtc.getUTCMinutes())}`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${xmlEscape(DPO_COMPANY_TOKEN)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount.toFixed(2)}</PaymentAmount>
    <PaymentCurrency>${xmlEscape(currency)}</PaymentCurrency>
    <CompanyRef>${xmlEscape(transRef)}</CompanyRef>
    <RedirectURL>${xmlEscape(redirectUrl)}</RedirectURL>
    <BackURL>${xmlEscape(backUrl)}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>15</PTL>
    <customerEmail>${xmlEscape(userEmail)}</customerEmail>
    <customerFirstName>${xmlEscape(customerFirstName)}</customerFirstName>
    <customerLastName>${xmlEscape(customerLastName)}</customerLastName>
    <customerPhone>${xmlEscape(customerPhone)}</customerPhone>
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${xmlEscape(DPO_SERVICE_TYPE)}</ServiceType>
      <ServiceDescription>${xmlEscape(description)}</ServiceDescription>
      <ServiceDate>${paymentDate}</ServiceDate>
    </Service>
  </Services>
</API3G>`;

    const dpoRes = await fetch(DPO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    });
    const dpoText = await dpoRes.text();
    const result = extractTag(dpoText, 'Result');
    const resultExplanation = extractTag(dpoText, 'ResultExplanation');
    const transToken = extractTag(dpoText, 'TransToken');

    if (result !== '000' || !transToken) {
      console.error('DPO createToken failed', { result, resultExplanation, dpoText });
      return new Response(JSON.stringify({
        error: 'Payment provider error',
        code: result,
        message: resultExplanation,
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const paymentRedirect = `${DPO_PAYMENT_URL}?ID=${encodeURIComponent(transToken)}`;

    const { data: inserted, error: insErr } = await admin.from('dpo_payments').insert({
      user_id: userId,
      reference_type: referenceType,
      reference_id: referenceId,
      amount,
      currency,
      status: 'pending',
      trans_token: transToken,
      trans_ref: transRef,
      redirect_url: paymentRedirect,
      result_code: result,
      result_explanation: resultExplanation,
      metadata: { description },
    }).select().single();

    if (insErr) {
      console.error('Insert dpo_payments failed', insErr);
    }

    return new Response(JSON.stringify({
      trans_token: transToken,
      trans_ref: transRef,
      redirect_url: paymentRedirect,
      payment_id: inserted?.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('dpo-create-token error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
