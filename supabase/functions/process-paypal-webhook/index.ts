import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const webhookData = await req.json();
    console.log('PayPal webhook received:', webhookData);

    // Handle different PayPal webhook events
    if (webhookData.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const orderId = webhookData.resource.id;
      
      // Update payment status to completed
      const { data, error } = await supabaseClient
        .from('payments')
        .update({ 
          status: 'completed',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('invoice_number', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating payment:', error);
        throw error;
      }

      console.log('Payment updated to completed:', data);

      // Process wallet transaction if applicable
      if (data) {
        const walletResult = await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: data.provider_id,
          p_transaction_type: 'credit',
          p_amount: data.amount * 0.85, // 85% goes to provider (15% platform fee)
          p_description: `Payment for consultation - Order ${orderId}`,
          p_payment_id: data.id
        });

        console.log('Provider wallet credited:', walletResult);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});