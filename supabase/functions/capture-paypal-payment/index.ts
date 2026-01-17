import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const captureRequestSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID required').max(100),
  paypalOrderId: z.string().min(1, 'PayPal order ID required').max(100)
});

interface PayPalCaptureRequest {
  paymentId: string;
  paypalOrderId: string;
}

interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasPaypalId: !!Deno.env.get('PAYPAL_CLIENT_ID'),
      hasPaypalSecret: !!Deno.env.get('PAYPAL_CLIENT_SECRET')
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Validate input
    const requestData = await req.json();
    const validationResult = captureRequestSchema.safeParse(requestData);

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

    const { paymentId, paypalOrderId } = validationResult.data;

    // Get payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    if (payment.status === 'completed') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already completed',
          paymentId: payment.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get PayPal credentials
    const paypalClientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const paypalClientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const paypalBaseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

    if (!paypalClientId || !paypalClientSecret) {
      const existingMetadata =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as Record<string, unknown>)
          : {};

      // Mock capture for development
      await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            mock_capture: true,
            captured_at: new Date().toISOString()
          }
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mock payment captured successfully',
          paymentId: payment.id
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

      // Capture the PayPal order
      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        throw new Error(`PayPal capture failed: ${errorText}`);
      }

      const captureData: PayPalCaptureResponse = await captureResponse.json();

      // Check if capture was successful
      const capture = captureData.purchase_units[0]?.payments?.captures?.[0];
      if (!capture || capture.status !== 'COMPLETED') {
        throw new Error(`PayPal capture not completed. Status: ${capture?.status}`);
      }

      const existingMetadata =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as Record<string, unknown>)
          : {};

      // Update payment record
      await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          external_payment_id: capture.id,
          metadata: {
            ...existingMetadata,
            paypal_capture_id: capture.id,
            paypal_capture_status: capture.status,
            captured_amount: capture.amount.value,
            captured_currency: capture.amount.currency_code,
            captured_at: new Date().toISOString()
          }
        })
        .eq('id', paymentId);

      // Process wallet credit if this was a wallet top-up
      const requestedServiceId =
        payment.metadata && typeof payment.metadata === 'object'
          ? (payment.metadata as any).requested_service_id
          : null;

      if (requestedServiceId === 'wallet_topup') {
        const { error: walletError } = await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: payment.patient_id,
          p_transaction_type: 'credit',
          p_amount: payment.amount,
          p_description: `PayPal wallet top-up - ${payment.invoice_number}`,
          p_reference_id: payment.id
        });

        if (walletError) {
          console.error('Error crediting wallet:', walletError);
        }
      }

      console.log('PayPal payment captured successfully:', {
        paymentId: payment.id,
        captureId: capture.id,
        amount: capture.amount.value,
        currency: capture.amount.currency_code
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment captured successfully',
          paymentId: payment.id,
          captureId: capture.id,
          amount: capture.amount.value,
          currency: capture.amount.currency_code
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (paypalError: unknown) {
      console.error('PayPal capture error:', paypalError);
      const errorMessage = paypalError instanceof Error ? paypalError.message : 'Unknown PayPal error';

      // Update payment status to failed
      await supabaseClient
        .from('payments')
        .update({
          status: 'failed',
          error_message: errorMessage,
          failed_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      throw new Error(`PayPal capture error: ${errorMessage}`);
    }

  } catch (error: unknown) {
    console.error('Error capturing PayPal payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        message: 'Failed to capture PayPal payment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
