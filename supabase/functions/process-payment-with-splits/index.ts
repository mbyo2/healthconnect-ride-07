import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const paymentSplitsSchema = z.object({
  amount: z.number().positive().max(1000000, 'Amount exceeds maximum'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS']),
  patientId: z.string().uuid('Invalid patient ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  serviceId: z.string().max(200, 'Service ID too long'),
  institutionId: z.string().uuid('Invalid institution ID').optional(),
  paymentMethod: z.enum(['paypal', 'wallet']).optional().default('wallet'),
  paymentType: z.enum(['consultation', 'pharmacy']).optional().default('consultation'),
  redirectUrl: z.string().url().optional()
});

interface PaymentWithSplitsRequest {
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  institutionId?: string;
  paymentMethod?: 'paypal' | 'wallet';
  paymentType?: 'consultation' | 'pharmacy';
  redirectUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate input
    const requestData = await req.json();
    const validationResult = paymentSplitsSchema.safeParse(requestData);
    
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

    const { amount, currency, patientId, providerId, serviceId, institutionId, paymentMethod, paymentType } = validationResult.data;

    // Prevent self-payment
    if (patientId === providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot process payment to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing payment with splits:', { amount, currency, patientId, providerId, serviceId, institutionId, paymentMethod, paymentType });

    // First, deduct from patient's wallet
    const walletResult = await supabase.rpc('process_wallet_transaction', {
      p_user_id: patientId,
      p_transaction_type: 'debit',
      p_amount: amount,
      p_description: `Payment for service ${serviceId}`
    });

    if (walletResult.error) {
      throw walletResult.error;
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        status: 'processing',
        payment_method: paymentMethod,
        payment_date: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      // Rollback wallet transaction
      await supabase.rpc('process_wallet_transaction', {
        p_user_id: patientId,
        p_transaction_type: 'credit',
        p_amount: amount,
        p_description: `Rollback for failed payment ${serviceId}`
      });
      throw paymentError;
    }

    // Process payment splits using the database function
    const { data: splitsResult, error: splitsError } = await supabase.rpc('process_payment_with_splits', {
      p_payment_id: payment.id,
      p_total_amount: amount,
      p_provider_id: providerId,
      p_institution_id: institutionId || null,
      p_payment_type: paymentType
    });

    if (splitsError) {
      console.error('Error processing payment splits:', splitsError);
      throw splitsError;
    }

    // Update payment status to completed
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id);

    console.log('Payment processed successfully with splits:', splitsResult);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        message: 'Payment processed successfully with commission splits',
        splits: splitsResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing payment with splits:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while processing the payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});