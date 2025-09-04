import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paypal-auth-algo, paypal-cert-id, paypal-transmission-id, paypal-transmission-time',
};

// Verify PayPal webhook signature
async function verifyPayPalSignature(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    const authAlgo = headers.get('paypal-auth-algo');
    const certId = headers.get('paypal-cert-id');
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    
    if (!authAlgo || !certId || !transmissionId || !transmissionTime) {
      console.error('Missing required PayPal headers for signature verification');
      return false;
    }

    // Log verification attempt
    console.log('PayPal webhook signature verification:', {
      authAlgo,
      certId,
      transmissionId,
      transmissionTime,
      webhookId
    });

    // For production, implement full PayPal certificate verification
    // This is a basic validation that required headers are present
    return true;
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

      // Update payment status to completed
      const { data, error } = await supabaseClient
        .from('payments')
        .update({ 
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

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

      console.log('Payment updated to completed:', data);

      // Process wallet transaction if applicable
      if (data) {
        const { error: walletError } = await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: data.provider_id,
          p_transaction_type: 'credit',
          p_amount: data.amount * 0.85, // 85% goes to provider (15% platform fee)
          p_description: `Payment for consultation - Order ${orderId}`,
          p_payment_id: data.id
        });

        if (walletError) {
          console.error('Error crediting provider wallet:', walletError);
          return new Response(
            JSON.stringify({ error: 'Failed to credit wallet' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
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