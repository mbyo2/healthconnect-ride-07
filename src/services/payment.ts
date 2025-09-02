
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

// Database-backed wallet service
export const getUserWallet = async (userId: string) => {
  try {
    const { data: wallet, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching wallet:', error);
      return null;
    }

    return wallet;
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }
};

export const getWalletBalance = async (): Promise<number> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data: wallet, error } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching wallet balance:', error);
      throw error;
    }

    return wallet?.balance || 0;
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return 0;
  }
};

export const addFundsToWallet = async (userId: string, amount: number) => {
  try {
    const { data, error } = await supabase.rpc('process_wallet_transaction', {
      p_user_id: userId,
      p_transaction_type: 'credit',
      p_amount: amount,
      p_description: 'Funds added to wallet'
    });

    if (error) {
      console.error('Error adding funds to wallet:', error);
      throw error;
    }

    console.log('Funds added successfully:', data);
    return true;
  } catch (error) {
    console.error('Failed to add funds to wallet:', error);
    throw error;
  }
};

export const checkWalletBalance = async (userId: string, requiredAmount: number): Promise<boolean> => {
  try {
    const wallet = await getUserWallet(userId);
    if (!wallet) return false;
    return wallet.balance >= requiredAmount;
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    return false;
  }
};

export const deductFromWallet = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('process_wallet_transaction', {
      p_user_id: userId,
      p_transaction_type: 'debit',
      p_amount: amount,
      p_description: `Payment deduction`
    });

    if (error) {
      console.error('Error deducting from wallet:', error);
      return false;
    }

    console.log(`Deducted ${amount} from wallet for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Error deducting from wallet:", error);
    return false;
  }
};
