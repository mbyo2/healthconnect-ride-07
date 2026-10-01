import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { resolveServicePrice, resolveReferenceAmount, assertTrustedAmount, PriceMismatchError } from '../_shared/price-guard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Input validation schema
const paymentSplitsSchema = z.object({
  amount: z.number().positive().max(1000000, 'Amount exceeds maximum'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS', 'ZMW', 'ZAR', 'NGN', 'GHS']),
  patientId: z.string().uuid('Invalid patient ID'),
  providerId: z.string().uuid('Invalid provider ID'),
  serviceId: z.string().max(200, 'Service ID too long'),
  institutionId: z.string().uuid('Invalid institution ID').optional(),
  paymentMethod: z.enum(['paypal', 'wallet']).optional().default('wallet'),
  paymentType: z.enum(['consultation', 'pharmacy']).optional().default('consultation'),
  redirectUrl: z.string().url().optional(),
  // Idempotency key: client-generated UUID for this payment attempt.
  // If provided and a payment already exists with this key, returns the
  // existing payment instead of debiting again (replay safety).
  idempotencyKey: z.string().uuid('Invalid idempotency key').optional()
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
  idempotencyKey?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication - user must be logged in
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth client to validate the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for privileged operations
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

    const { amount: clientAmount, currency, patientId, providerId, serviceId, institutionId, paymentMethod, paymentType, idempotencyKey } = validationResult.data;

    // CRITICAL: Verify the authenticated user is the patient making the payment
    if (user.id !== patientId) {
      console.error('Authorization failed: user', user.id, 'attempted to pay as patient', patientId);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - can only process payments for yourself' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-payment
    if (patientId === providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot process payment to yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY: If client provided an idempotency key and we already
    // processed it, return the existing payment (replay safety — no double debit).
    // The DB unique constraint on idempotency_key is the race-safe backstop.
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from('payments')
        .select('id, status, amount')
        .eq('patient_id', patientId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existing) {
        console.log('Idempotency key already processed, returning existing:', existing.id);
        return new Response(
          JSON.stringify({
            success: true,
            paymentId: existing.id,
            message: 'Payment already processed (idempotent)',
            alreadyProcessed: true
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // Resolve the authoritative price server-side — never trust the client amount
    let amount: number;
    try {
      const trusted = paymentType === 'pharmacy'
        ? await resolveReferenceAmount(supabase as any, 'order', serviceId)
        : await resolveServicePrice(supabase as any, serviceId);
      amount = assertTrustedAmount(clientAmount, trusted);
    } catch (e) {
      if (e instanceof PriceMismatchError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment amount does not match the authoritative price', expectedAmount: e.expected }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw e;
    }

    console.log('Processing payment with splits:', { authenticatedUserId: user.id, amount, currency, patientId, providerId, serviceId, institutionId, paymentMethod, paymentType });

    // ATOMIC: Single RPC does debit + payment + splits + credits in ONE
    // transaction. Any failure rolls back everything — no partial debits.
    // The DB unique constraint on idempotency_key makes this race-safe.
    const { data: result, error: rpcError } = await supabase.rpc('process_full_payment', {
      p_patient_id: patientId,
      p_provider_id: providerId,
      p_total_amount: amount,
      p_payment_type: paymentType || 'consultation',
      p_institution_id: institutionId || null,
      p_service_id: serviceId,
      p_payment_method: paymentMethod,
      p_currency: currency || 'ZMW',
      p_idempotency_key: idempotencyKey || null,
    });

    if (rpcError) {
      console.error('Error processing atomic payment:', rpcError);
      throw rpcError;
    }

    console.log('Payment processed successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: result.payment_id,
        message: result.already_processed
          ? 'Payment already processed (idempotent)'
          : 'Payment processed successfully with commission splits',
        alreadyProcessed: result.already_processed || false,
        splits: {
          total: result.total,
          platform_amount: result.platform_amount,
          payee_amount: result.payee_amount,
          payee_type: result.payee_type,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Error processing payment with splits:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An internal error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});