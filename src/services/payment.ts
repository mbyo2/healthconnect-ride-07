
import { supabase } from "@/integrations/supabase/client";
import { PaymentRequest, PaymentResponse } from "@/types/payment";
import { toast } from "sonner";

export const createPayment = async (paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    console.log("Creating payment:", paymentDetails);
    
    const { data, error } = await supabase.functions.invoke('process-dpo-payment', {
      body: paymentDetails
    });

    if (error) throw error;

    console.log("Payment created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating payment:", error);
    toast.error("Failed to process payment");
    throw error;
  }
};

export const generatePaymentReceipt = async (paymentId: string): Promise<void> => {
  try {
    console.log("Generating receipt for payment:", paymentId);
    
    const { data, error } = await supabase.functions.invoke('generate-receipt', {
      body: { paymentId }
    });

    if (error) throw error;

    console.log("Receipt generated successfully:", data);
    toast.success("Receipt generated successfully");
  } catch (error) {
    console.error("Error generating receipt:", error);
    toast.error("Failed to generate receipt");
    throw error;
  }
};

export const getUserWallet = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }
};

export const addFundsToWallet = async (userId: string, amount: number) => {
  try {
    // Get the wallet first
    const wallet = await getUserWallet(userId);
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      const { error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: amount,
          currency: 'USD'
        });
      
      if (createError) throw createError;
    } else {
      // Update existing wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance + amount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) throw updateError;
    }
    
    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet?.id || userId,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        description: 'Added funds to wallet'
      });
    
    if (transactionError) throw transactionError;
    
    return true;
  } catch (error) {
    console.error("Error adding funds:", error);
    throw error;
  }
};
