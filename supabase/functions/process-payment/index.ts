import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  redirectUrl?: string;
  paymentMethod: 'paypal' | 'wallet';
}

// PayPal API functions
async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${data.error_description}`);
  }
  
  return data.access_token;
}

async function createPayPalOrder(amount: number, currency: string, accessToken: string, returnUrl: string, cancelUrl: string) {
  const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
        description: 'Telehealth Consultation',
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`PayPal order creation failed: ${JSON.stringify(data)}`);
  }
  
  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { amount, currency, patientId, providerId, serviceId, redirectUrl, paymentMethod } = await req.json() as PaymentRequest;

    console.log('Processing payment request:', { amount, currency, patientId, providerId, serviceId, paymentMethod });

    // Generate a unique payment ID
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    if (paymentMethod === 'paypal') {
      // Create PayPal payment
      const accessToken = await getPayPalAccessToken();
      const returnUrl = redirectUrl || `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/payment-success`;
      const cancelUrl = redirectUrl || `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/payment-cancel`;
      
      const paypalOrder = await createPayPalOrder(amount, currency, accessToken, returnUrl, cancelUrl);
      
      // Store payment record in pending status
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          id: paymentId,
          patient_id: patientId,
          provider_id: providerId,
          service_id: serviceId,
          amount: amount,
          currency: currency,
          status: 'pending',
          payment_method: 'paypal',
          invoice_number: paypalOrder.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Find approval URL
      const approvalUrl = paypalOrder.links.find((link: any) => link.rel === 'approve')?.href;

      console.log('PayPal order created:', paypalOrder.id);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payment.id,
          paymentUrl: approvalUrl,
          paypalOrderId: paypalOrder.id,
          amount,
          currency
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Handle wallet payment (existing logic)
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          id: paymentId,
          patient_id: patientId,
          provider_id: providerId,
          service_id: serviceId,
          amount: amount,
          currency: currency,
          status: 'completed',
          payment_method: 'wallet',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      console.log('Wallet payment processed:', payment);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payment.id,
          amount,
          currency
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});