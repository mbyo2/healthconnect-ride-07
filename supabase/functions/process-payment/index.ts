
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
  paymentMethod?: { 
    type: string; 
    id?: string;
  }
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

    // Generate a unique payment ID
    const paymentId = `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Create payment record in our database
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        id: paymentId,
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        currency: currency,
        status: 'completed', // For demo, we assume all payments succeed
        payment_method: paymentMethod?.type || 'wallet',
        payment_method_id: paymentMethod?.id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    console.log('Payment processed:', payment);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        paymentUrl: redirectUrl || '',
        amount,
        currency
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
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
