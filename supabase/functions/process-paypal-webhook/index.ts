import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-id, paypal-transmission-id, paypal-transmission-time',
};

// Get a PayPal access token to call verification API
async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;
  const auth = btoa(`${clientId}:${clientSecret}`);
  const base = Deno.env.get('PAYPAL_BASE_URL') || Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com';
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

// Verify PayPal webhook signature server-side using PayPal's verification API
async function verifyPayPalSignature(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    const authAlgo = headers.get('paypal-auth-algo');
    const certUrl = headers.get('paypal-cert-url');
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const transmissionTime = headers.get('paypal-transmission-time');

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      console.error('Missing required PayPal signature headers');
      return false;
    }

    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      console.error('Unable to obtain PayPal access token for verification');
      return false;
    }

    const base = Deno.env.get('PAYPAL_BASE_URL') || Deno.env.get('PAYPAL_API_BASE') || 'https://api-m.paypal.com';
    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyRes.ok) {
      console.error('PayPal verify API returned', verifyRes.status);
      return false;
    }
    const result = await verifyRes.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Error verifying PayPal signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get PayPal webhook ID from environment
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      console.error('PayPal webhook ID not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const bodyText = await req.text();
    
    // Verify PayPal webhook signature
    const isValidSignature = await verifyPayPalSignature(req.headers, bodyText, webhookId);
    if (!isValidSignature) {
      console.error('Invalid PayPal webhook signature');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const webhookData = JSON.parse(bodyText);
    console.log('Verified PayPal webhook received:', webhookData.event_type);

    // Handle different PayPal webhook events
    if (webhookData.event_type === 'CHECKOUT.ORDER.APPROVED') {
      // APPROVED is a pre-capture event: the payer approved the order but no
      // money has moved yet. Settlement happens in capture-paypal-payment
      // after the capture is confirmed. Marking the payment completed here
      // booked settlement (including platform commission) on money that may
      // never arrive, and for wallet top-ups it mis-settled the patient's own
      // funds as a consultation payment. So: acknowledge only, settle nothing.
      const orderId = webhookData.resource?.id;
      console.log('Order approved (pre-capture, no settlement):', { orderId });
      return new Response(
        JSON.stringify({ received: true, status: 'acknowledged_pre_capture', orderId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, status: 'processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});