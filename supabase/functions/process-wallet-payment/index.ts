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

// Mock wallet system
const mockWallets = new Map();

const getUserWallet = (userId: string) => {
  if (!mockWallets.has(userId)) {
    mockWallets.set(userId, { 
      id: `wallet-${userId}`,
      userId,
      balance: 100,
      currency: 'USD',
      updatedAt: new Date().toISOString()
    });
  }
  return mockWallets.get(userId);
};

const deductFromWallet = (userId: string, amount: number): boolean => {
  const wallet = getUserWallet(userId);
  if (wallet.balance < amount) {
    return false;
  }
  
  wallet.balance -= amount;
  wallet.updatedAt = new Date().toISOString();
  mockWallets.set(userId, wallet);
  return true;
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

    const { amount, currency, patientId, providerId, serviceId } = await req.json() as PaymentRequest;

    console.log('Processing wallet payment:', { amount, patientId, providerId, serviceId });

    // Check wallet balance
    const wallet = getUserWallet(patientId);
    if (wallet.balance < amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Insufficient funds. Available: $${wallet.balance}, Required: $${amount}`,
          availableBalance: wallet.balance,
          requiredAmount: amount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    // Deduct from wallet
    const deductionSuccess = deductFromWallet(patientId, amount);
    if (!deductionSuccess) {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to deduct from wallet' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
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
      // Rollback wallet deduction
      const rollbackWallet = getUserWallet(patientId);
      rollbackWallet.balance += amount;
      mockWallets.set(patientId, rollbackWallet);
      throw paymentError;
    }

    console.log('Wallet payment processed successfully:', payment);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        message: 'Payment processed successfully',
        newBalance: getUserWallet(patientId).balance,
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
  } catch (error) {
    console.error('Error processing wallet payment:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});