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
}

// Database-backed wallet system using Supabase functions

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

    const { amount, currency, patientId, providerId, serviceId } = await req.json() as PaymentRequest;

    console.log('Processing wallet payment:', { amount, patientId, providerId, serviceId });

    // Process wallet transaction using database function
    try {
      const { data: transactionResult, error: transactionError } = await supabaseClient
        .rpc('process_wallet_transaction', {
          p_user_id: patientId,
          p_transaction_type: 'debit',
          p_amount: amount,
          p_description: `Payment for service ${serviceId}`,
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
              message: `Insufficient funds. Available: $${currentBalance}, Required: $${amount}`,
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

    // Create payment record in database
    const paymentId = `PAY-WALLET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        id: paymentId,
        patient_id: patientId,
        provider_id: providerId,
        service_id: serviceId,
        amount: amount,
        currency: currency,
        status: 'completed',
        payment_method: 'wallet',
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
          p_description: `Rollback for failed payment ${paymentId}`,
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
      const walletErrorMessage = walletError instanceof Error ? walletError.message : 'Wallet transaction failed';
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: walletErrorMessage
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
  } catch (error: unknown) {
    console.error('Error processing wallet payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});