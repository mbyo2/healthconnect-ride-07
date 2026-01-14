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
    // Create client with user's JWT for auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate the authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency, patientId, providerId, serviceId, redirectUrl } = await req.json() as PaymentRequest;

    // Validate that the authenticated user is the patient
    if (user.id !== patientId) {
      console.error('User mismatch: authenticated user', user.id, 'does not match patientId', patientId);
      return new Response(
        JSON.stringify({ error: 'You can only create payments for yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!providerId || !serviceId) {
      return new Response(
        JSON.stringify({ error: 'Provider ID and Service ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations after validation
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate provider exists
    const { data: provider, error: providerError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate service exists
    const { data: service, error: serviceError } = await serviceClient
      .from('healthcare_services')
      .select('id, is_available')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return new Response(
        JSON.stringify({ error: 'Invalid service' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!service.is_available) {
      return new Response(
        JSON.stringify({ error: 'Service is not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment record in our database
    const { data: payment, error: paymentError } = await serviceClient
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        status: 'pending',
        payment_method: 'dpo',
        invoice_number: `PAY-${Date.now()}-${patientId.substring(0, 8)}`,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw paymentError;
    }

    // DPO API integration will be added here once API key is provided
    // For now, we'll return a mock payment URL
    const mockPaymentUrl = `https://secure.3gdirectpay.com/payv3.asp?ID=mock-${payment.id}`;

    console.log('Payment record created for user:', user.id, 'payment:', payment.id);

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
  } catch (error: unknown) {
    console.error('Error processing payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
