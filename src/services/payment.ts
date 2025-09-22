
import { supabase } from "@/integrations/supabase/client";
import { PaymentRequest, PaymentResponse } from "@/types/payment";
import { toast } from "sonner";
import { errorHandler } from "@/utils/error-handler";
import { logger } from "@/utils/logger";
import { securityNotificationService } from "@/utils/security-notifications";

export const createPayment = async (paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    logger.info("Creating payment", "PAYMENT", { 
      amount: paymentDetails.amount, 
      currency: paymentDetails.currency,
      method: paymentDetails.paymentMethod 
    });

    // Create payment record with pending status
    const { data: paymentRecord, error: recordError } = await supabase
      .from('payments')
      .insert({
        patient_id: paymentDetails.patientId,
        provider_id: paymentDetails.providerId,
        service_id: paymentDetails.serviceId,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        payment_method: paymentDetails.paymentMethod || 'paypal',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // Process payment based on method
    let paymentResult;
    if (paymentDetails.paymentMethod === 'wallet') {
      paymentResult = await processWalletPayment(paymentRecord.id, paymentDetails);
    } else {
      paymentResult = await processExternalPayment(paymentRecord.id, paymentDetails);
    }

    // Update payment status based on result
    await updatePaymentStatus(paymentRecord.id, paymentResult.success ? 'completed' : 'failed', {
      external_payment_id: paymentResult.paymentId,
      payment_url: paymentResult.paymentUrl,
      error_message: paymentResult.error
    });

    logger.info("Payment processed", "PAYMENT", { 
      paymentId: paymentRecord.id, 
      status: paymentResult.success ? 'completed' : 'failed' 
    });

    return {
      ...paymentResult,
      paymentId: paymentRecord.id
    };

  } catch (error) {
    errorHandler.handleError(error, 'createPayment');
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

// Payment status management functions
export const updatePaymentStatus = async (
  paymentId: string, 
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded',
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'failed') {
      updateData.failed_at = new Date().toISOString();
    }

    if (metadata) {
      updateData.metadata = metadata;
    }

    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId);

    if (error) throw error;

    logger.info('Payment status updated', 'PAYMENT', { paymentId, status });

  } catch (error) {
    errorHandler.handleError(error, 'updatePaymentStatus');
    throw error;
  }
};

export const processWalletPayment = async (paymentId: string, paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Check wallet balance
    const hasBalance = await checkWalletBalance(paymentDetails.patientId, paymentDetails.amount);
    
    if (!hasBalance) {
      return {
        success: false,
        message: 'Insufficient wallet balance',
        error: 'INSUFFICIENT_FUNDS'
      };
    }

    // Deduct from wallet
    const deductionSuccess = await deductFromWallet(paymentDetails.patientId, paymentDetails.amount);
    
    if (!deductionSuccess) {
      return {
        success: false,
        message: 'Failed to deduct from wallet',
        error: 'DEDUCTION_FAILED'
      };
    }

    // Get updated balance
    const newBalance = await getWalletBalance();

    return {
      success: true,
      message: 'Payment completed successfully',
      newBalance,
      transactionDetails: {
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        date: new Date().toISOString(),
        method: 'wallet'
      }
    };

  } catch (error) {
    errorHandler.handleError(error, 'processWalletPayment');
    return {
      success: false,
      message: 'Wallet payment processing failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
};

export const processExternalPayment = async (paymentId: string, paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    // Process through external payment provider (DPO, PayPal, etc.)
    const { data, error } = await supabase.functions.invoke('process-dpo-payment', {
      body: {
        ...paymentDetails,
        paymentId
      }
    });

    if (error) throw error;

    return {
      success: true,
      paymentId: data.paymentId,
      paymentUrl: data.paymentUrl,
      message: 'Payment initiated successfully',
      transactionDetails: {
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        date: new Date().toISOString(),
        method: paymentDetails.paymentMethod || 'paypal'
      }
    };

  } catch (error) {
    errorHandler.handleError(error, 'processExternalPayment');
    return {
      success: false,
      message: 'External payment processing failed',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
};

export const getPaymentStatus = async (paymentId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('status')
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    return data.status;

  } catch (error) {
    errorHandler.handleError(error, 'getPaymentStatus');
    return null;
  }
};

export const refundPayment = async (paymentId: string, reason?: string, amount?: number): Promise<boolean> => {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    const refundAmount = amount || payment.amount;

    // Process refund based on original payment method
    if (payment.payment_method === 'wallet') {
      // Add funds back to wallet
      await addFundsToWallet(payment.patient_id, refundAmount);
    } else {
      // Process external refund
      const { error: refundError } = await supabase.functions.invoke('process-refund', {
        body: {
          paymentId,
          amount: refundAmount,
          reason
        }
      });

      if (refundError) throw refundError;
    }

    // Update payment status
    await updatePaymentStatus(paymentId, 'refunded', {
      refund_amount: refundAmount,
      refund_reason: reason,
      refunded_at: new Date().toISOString()
    });

    logger.info('Payment refunded successfully', 'PAYMENT', { paymentId, refundAmount });
    return true;

  } catch (error) {
    errorHandler.handleError(error, 'refundPayment');
    return false;
  }
};

// Enhanced wallet security functions
export const validateWalletTransaction = async (userId: string, amount: number, transactionType: 'credit' | 'debit'): Promise<boolean> => {
  try {
    // Check for suspicious transaction patterns
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // Simplified query to avoid type instantiation issues
    const recentTransactionsQuery = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo);
    
    const { data: recentTransactions, error } = recentTransactionsQuery;
    
    const recentCount = recentTransactions?.length || 0;

    if (error) throw error;

    // Flag large transactions
    if (amount > 10000) {
      await securityNotificationService.createSecurityNotification(
        userId,
        'suspicious_activity',
        'Large Transaction Alert',
        `A large ${transactionType} transaction of ${amount} was attempted on your wallet.`,
        'high',
        true
      );
    }

    // Check for rapid transactions in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: rapidCount } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo);

    if (rapidCount && rapidCount > 5) {
      await securityNotificationService.createSecurityNotification(
        userId,
        'suspicious_activity',
        'Rapid Transaction Alert',
        'Multiple rapid transactions detected on your wallet. Please verify these transactions.',
        'medium',
        true
      );
    }

    return true;

  } catch (error) {
    errorHandler.handleError(error, 'validateWalletTransaction');
    return false;
  }
};
