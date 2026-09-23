import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { resolveServicePrice, resolveReferenceAmount, assertTrustedAmount, PriceMismatchError } from '../_shared/price-guard.ts';

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
  orderId?: string;
  description?: string;
  redirectUrl?: string;
}

// Database-backed wallet system using Supabase functions

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json() as PaymentRequest;
    const { amount: clientAmount, currency, providerId: clientProviderId, serviceId, orderId, description } = body;
    // FORCE patientId to the authenticated user — never trust client-supplied value
    const patientId = user.id;
    if (!clientAmount || clientAmount <= 0 || (!serviceId && !orderId)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve the authoritative price server-side — never trust the client amount.
    // Pharmacy orders resolve from the order total; services from the price book.
    let amount: number;
    try {
      const trusted = orderId
        ? await resolveReferenceAmount(supabaseClient as any, 'order', orderId)
        : await resolveServicePrice(supabaseClient as any, serviceId);
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
    // Resolve a real provider profile for the payments row (provider_id has
    // an FK to profiles — sentinel UUIDs and order IDs violate it and fail
    // the whole payment). Client value wins when valid; pharmacy orders fall
    // back to the dispensing facility's admin, then any affiliated staffer.
    let providerId: string | null = null;
    if (clientProviderId) {
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('id', clientProviderId)
        .maybeSingle();
      if (prof) providerId = clientProviderId;
    }
    if (!providerId && orderId) {
      const { data: order } = await supabaseClient
        .from('orders')
        .select('pharmacy_id')
        .eq('id', orderId)
        .maybeSingle();
      const pharmacyId = (order as any)?.pharmacy_id;
      if (pharmacyId) {
        const { data: inst } = await supabaseClient
          .from('healthcare_institutions')
          .select('admin_id')
          .eq('id', pharmacyId)
          .maybeSingle();
        if ((inst as any)?.admin_id) {
          const { data: adminProf } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('id', (inst as any).admin_id)
            .maybeSingle();
          if (adminProf) providerId = (inst as any).admin_id;
        }
        if (!providerId) {
          const { data: staffer } = await supabaseClient
            .from('institution_personnel')
            .select('user_id')
            .eq('institution_id', pharmacyId)
            .limit(1)
            .maybeSingle();
          if ((staffer as any)?.user_id) providerId = (staffer as any).user_id;
        }
      }
    }
    if (!providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not link this payment to a provider account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Order references travel in metadata — service_id must stay NULL for
    // orders (it references healthcare_services).
    const serviceIdForDb = orderId ? null : serviceId;
    console.log('Processing wallet payment:', { amount, patientId, providerId, serviceId: serviceIdForDb, orderId });


    // Process wallet transaction using database function
    try {
      const { data: transactionResult, error: transactionError } = await supabaseClient
        .rpc('process_wallet_transaction', {
          p_user_id: patientId,
          p_transaction_type: 'debit',
          p_amount: amount,
          p_description: orderId ? `Wallet payment for order ${orderId}` : `Wallet payment for service ${serviceId}`,
          p_payment_id: null // Will be set after payment record creation
        });

      if (transactionError) {
        console.error('Wallet transaction error:', transactionError);
        
        // Check if it's an insufficient funds error
        if (transactionError.message && transactionError.message.includes('Insufficient funds')) {
          const balanceMatch = transactionError.message.match(/Current balance: ([\d.]+)/);
          const currentBalance = balanceMatch ? parseFloat(balanceMatch[1]) : 0;
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Insufficient funds. Available: K${currentBalance}, Required: K${amount}`,
              availableBalance: currentBalance,
              requiredAmount: amount
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400
            }
          );
        }
        
        throw transactionError;
      }

    // Create payment record in database. The id is DB-defaulted (uuid) —
    // custom string IDs violate the uuid PK. service_id stays NULL for
    // pharmacy orders (it references healthcare_services; the order link
    // travels in metadata).
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceIdForDb,
        amount: amount,
        currency: (currency || 'ZMW').toUpperCase(),
        status: 'completed',
        payment_method: 'wallet',
        metadata: orderId ? { reference_type: 'order', reference_id: orderId, description } : { description },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

      if (paymentError) {
        console.error('Payment record error:', paymentError);
        // Rollback wallet transaction
        await supabaseClient.rpc('process_wallet_transaction', {
          p_user_id: patientId,
          p_transaction_type: 'credit',
          p_amount: amount,
          p_description: `Rollback for failed wallet payment of ${amount}`,
          p_payment_id: null
        });
        throw paymentError;
      }

      // Update the transaction with payment ID
      await supabaseClient
        .from('wallet_transactions')
        .update({ payment_id: payment.id })
        .eq('id', transactionResult.transaction_id);

    console.log('Wallet payment processed successfully:', payment);

      return new Response(
        JSON.stringify({
          success: true,
          paymentId: payment.id,
          message: 'Payment processed successfully',
          newBalance: transactionResult.new_balance,
          transactionDetails: {
            amount,
            currency,
            date: new Date().toISOString(),
            method: 'wallet'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (walletError: unknown) {
      console.error('Wallet transaction failed:', walletError);
      const rawMsg = walletError instanceof Error ? walletError.message : '';
      // Only surface known safe business messages
      const safeMsg = /insufficient/i.test(rawMsg)
        ? 'Insufficient wallet balance'
        : 'Wallet transaction failed';
      return new Response(
        JSON.stringify({
          success: false,
          message: safeMsg
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
  } catch (error: unknown) {
    console.error('Error processing wallet payment:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred', success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});