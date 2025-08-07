
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

// Simulate a wallet system until we implement a real one
const mockWallets = new Map();

export const getUserWallet = async (userId: string) => {
  try {
    // Simulate getting wallet from database
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
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return null;
  }
};

export const addFundsToWallet = async (userId: string, amount: number) => {
  try {
    // Get or create wallet
    let wallet = await getUserWallet(userId);
    
    if (!wallet) {
      wallet = {
        id: `wallet-${userId}`,
        userId,
        balance: amount,
        currency: 'USD',
        updatedAt: new Date().toISOString()
      };
      mockWallets.set(userId, wallet);
    } else {
      // Update existing wallet
      wallet.balance += amount;
      wallet.updatedAt = new Date().toISOString();
      mockWallets.set(userId, wallet);
    }
    
    // Log transaction
    console.log(`Added ${amount} to wallet for user ${userId}`);
    
    return true;
  } catch (error) {
    console.error("Error adding funds:", error);
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
    const wallet = await getUserWallet(userId);
    if (!wallet || wallet.balance < amount) {
      return false;
    }
    
    wallet.balance -= amount;
    wallet.updatedAt = new Date().toISOString();
    mockWallets.set(userId, wallet);
    
    console.log(`Deducted ${amount} from wallet for user ${userId}. New balance: ${wallet.balance}`);
    return true;
  } catch (error) {
    console.error("Error deducting from wallet:", error);
    return false;
  }
};
