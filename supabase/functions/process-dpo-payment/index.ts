import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const DPO_COMPANY_TOKEN = Deno.env.get('DPO_COMPANY_TOKEN');
const DPO_TEST_URL = "https://secure.3gdirectpay.com/API/v6/";
const DPO_LIVE_URL = "https://secure.3gdirectpay.com/API/v6/";

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
    const { amount, currency, patientId, providerId, serviceId, redirectUrl } = await req.json() as PaymentRequest;

    // Create payment request to DPO
    const paymentRequest = {
      CompanyToken: DPO_COMPANY_TOKEN,
      Amount: amount,
      Currency: currency,
      RedirectURL: redirectUrl,
      BackURL: redirectUrl,
      CompanyRefUnique: `PAY-${Date.now()}-${patientId}`,
      CustomerEmail: "patient@example.com", // You should get this from the patient's profile
      CustomerFirstName: "Patient", // You should get this from the patient's profile
      CustomerLastName: "Name", // You should get this from the patient's profile
      ServiceDescription: "Healthcare Service Payment",
    };

    console.log('Sending payment request to DPO:', paymentRequest);

    const response = await fetch(`${DPO_TEST_URL}/createToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });

    const dpoResponse = await response.json();
    console.log('DPO response:', dpoResponse);

    if (dpoResponse.Result !== '000') {
      throw new Error(`DPO Error: ${dpoResponse.ResultExplanation}`);
    }

    // Create payment record in our database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        status: 'pending',
        payment_method: 'dpo',
        invoice_number: paymentRequest.CompanyRefUnique,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        success: true,
        transToken: dpoResponse.TransToken,
        paymentUrl: `${DPO_TEST_URL}/paymentPage/${dpoResponse.TransToken}`,
        paymentId: payment.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing DPO payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});