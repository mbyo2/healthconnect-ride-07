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
  redirectUrl: string;
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

    const { amount, currency, patientId, providerId, serviceId, redirectUrl } = await req.json() as PaymentRequest;

    // Create payment record in our database first
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        status: 'pending',
        payment_method: 'dpo',
        invoice_number: `PAY-${Date.now()}-${patientId}`,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // DPO API integration will be added here once API key is provided
    // For now, we'll return a mock payment URL
    const mockPaymentUrl = `https://secure.3gdirectpay.com/payv3.asp?ID=mock-${payment.id}`;

    console.log('Payment record created:', payment);

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: mockPaymentUrl,
        paymentId: payment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
