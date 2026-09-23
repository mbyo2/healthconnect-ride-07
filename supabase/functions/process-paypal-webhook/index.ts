import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different PayPal webhook events
    if (webhookData.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = webhookData.resource.id;
      const paymentId = webhookData.resource.custom_id; // This should be our payment ID

      console.log('Processing order approval:', { orderId, paymentId });

      // Validate payment ID format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!paymentId || !uuidRegex.test(paymentId)) {
        console.error('Invalid or missing payment ID:', paymentId);
        return new Response(
          JSON.stringify({ error: 'Invalid payment ID' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Update payment status to completed ONLY if currently pending (idempotency guard)
      const { data, error } = await supabaseClient
        .from('payments')
        .update({ 
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .eq('status', 'pending')
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating payment:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      if (!data) {
        console.log('Payment already processed or not pending, skipping wallet credit:', paymentId);
        return new Response(
          JSON.stringify({ received: true, status: 'already_processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment updated to completed:', data);

      // Settle the payment: platform fee to the app owner wallet, the rest to
      // the single payee (institution, provider or pharmacy). Commission rates
      // come from commission_settings, never hardcoded here.
      if (data) {
        const { data: existingSplits } = await supabaseClient
          .from('payment_splits')
          .select('id')
          .eq('payment_id', data.id)
          .limit(1);

        if (!existingSplits || existingSplits.length === 0) {
          const { data: institution } = await supabaseClient
            .from('healthcare_institutions')
            .select('id, type')
            .eq('id', data.provider_id)
            .maybeSingle();

          const refType = (data.metadata as any)?.reference_type ?? '';
          const isPharmacy =
            (institution?.type || '').toLowerCase().includes('pharmac') ||
            refType === 'order' ||
            refType === 'pharmacy_sale';

          const { error: walletError } = await supabaseClient.rpc('process_payment_with_splits', {
            p_payment_id: data.id,
            p_total_amount: data.amount,
            p_provider_id: institution ? null : data.provider_id,
            p_institution_id: institution ? institution.id : null,
            p_payment_type: isPharmacy ? 'pharmacy' : 'consultation'
          });

          if (walletError) {
            console.error('Error settling payment splits:', walletError);
            return new Response(
              JSON.stringify({ error: 'Failed to credit wallet' }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }
        }


        console.log('Provider wallet credited successfully');
      }
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