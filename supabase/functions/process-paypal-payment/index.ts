import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const paypalPaymentSchema = z.object({
  amount: z.number().positive().max(1000000, 'Amount exceeds maximum'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS']),
  patientId: z.string().uuid('Invalid patient ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  serviceId: z.string().max(200, 'Service ID too long'),
  redirectUrl: z.string().url('Invalid redirect URL'),
  paymentMethod: z.string().max(50)
});

interface PayPalPaymentRequest {
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  redirectUrl: string;
  paymentMethod: string;
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
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

    // Validate input
    const requestData = await req.json();
    const validationResult = paypalPaymentSchema.safeParse(requestData);

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency, patientId, providerId, serviceId, redirectUrl } = validationResult.data;

    // Prevent self-payment
    if (patientId === providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot process payment to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment record in our database first
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        currency: currency || 'USD',
        status: 'pending',
        payment_method: 'paypal',
        invoice_number: `PAY-${Date.now()}-${patientId}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Get PayPal credentials from environment
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const paypalBaseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com'; // Default to sandbox

    if (!paypalClientId || !paypalClientSecret) {
      console.warn('PayPal credentials not configured, using mock payment');

      // Return mock payment URL for development
      const mockPaymentUrl = `${redirectUrl}?payment_id=${payment.id}&status=mock_success`;

      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: mockPaymentUrl,
          paymentId: payment.id,
          message: 'Mock PayPal payment created (development mode)'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Get PayPal access token
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        throw new Error(`PayPal token request failed: ${tokenResponse.statusText}`);
      }

      const tokenData: PayPalAccessTokenResponse = await tokenResponse.json();

      // Create PayPal order
      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: payment.id,
          amount: {
            currency_code: currency || 'USD',
            value: amount.toFixed(2)
          },
          description: `HealthConnect Payment - ${payment.invoice_number}`
        }],
        application_context: {
          return_url: `${redirectUrl}?payment_id=${payment.id}&status=success`,
          cancel_url: `${redirectUrl}?payment_id=${payment.id}&status=cancelled`,
          brand_name: 'HealthConnect',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW'
        }
      };

      const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`PayPal order creation failed: ${errorText}`);
      }

      const orderData: PayPalOrderResponse = await orderResponse.json();

      // Find approval URL
      const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

      if (!approvalUrl) {
        throw new Error('PayPal approval URL not found in response');
      }

      // Update payment record with PayPal order ID
      await supabaseClient
        .from('payments')
        .update({
          external_payment_id: orderData.id,
          payment_url: approvalUrl,
          metadata: {
            paypal_order_id: orderData.id,
            paypal_status: orderData.status
          }
        })
        .eq('id', payment.id);

      console.log('PayPal order created successfully:', {
        paymentId: payment.id,
        paypalOrderId: orderData.id,
        status: orderData.status
      });

      return new Response(
        JSON.stringify({
          success: true,
          paymentUrl: approvalUrl,
          paymentId: payment.id,
          paypalOrderId: orderData.id,
          message: 'PayPal payment created successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (paypalError) {
      console.error('PayPal API error:', paypalError);

      // Update payment status to failed
      await supabaseClient
        .from('payments')
        .update({
          status: 'failed',
          error_message: paypalError.message,
          failed_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      throw new Error(`PayPal integration error: ${paypalError.message}`);
    }

  } catch (error) {
    console.error('Error processing PayPal payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to process PayPal payment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
