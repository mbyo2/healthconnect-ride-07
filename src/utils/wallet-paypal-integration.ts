import { supabase } from "@/integrations/supabase/client";
import { logger } from './logger';
import { errorHandler } from './error-handler';
import { toast } from 'sonner';

export interface WalletPayPalConfig {
  paypalClientId?: string;
  paypalEnvironment: 'sandbox' | 'production';
  enableMockPayments: boolean;
}

export interface PayPalPaymentResult {
  success: boolean;
  paymentId?: string;
  paypalOrderId?: string;
  paymentUrl?: string;
  error?: string;
  message: string;
}

export interface WalletTopUpRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: 'paypal' | 'wallet';
  redirectUrl?: string;
}

class WalletPayPalIntegration {
  private config: WalletPayPalConfig;

  constructor() {
    this.config = {
      paypalEnvironment: 'sandbox', // Default to sandbox for development
      enableMockPayments: true // Enable mock payments when PayPal credentials are not configured
    };
  }

  async initializePayPalIntegration(): Promise<boolean> {
    try {
      // Check if PayPal credentials are configured
      const { data: settings } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'paypal_client_id')
        .single();

      if (settings?.setting_value) {
        this.config.paypalClientId = settings.setting_value;
        this.config.enableMockPayments = false;
        logger.info('PayPal integration initialized with real credentials', 'WALLET_PAYPAL');
      } else {
        logger.warn('PayPal credentials not configured, using mock payments', 'WALLET_PAYPAL');
      }

      return true;
    } catch (error) {
      logger.error('Failed to initialize PayPal integration', 'WALLET_PAYPAL', error);
      return false;
    }
  }

  async topUpWalletWithPayPal(request: WalletTopUpRequest): Promise<PayPalPaymentResult> {
    try {
      logger.info('Processing wallet top-up with PayPal', 'WALLET_PAYPAL', {
        userId: request.userId,
        amount: request.amount,
        currency: request.currency
      });

      // Validate request
      if (!request.userId || !request.amount || request.amount <= 0) {
        throw new Error('Invalid top-up request parameters');
      }

      // Create PayPal payment for wallet top-up
      const { data, error } = await supabase.functions.invoke('process-paypal-payment', {
        body: {
          amount: request.amount,
          currency: request.currency || 'USD',
          patientId: request.userId,
          providerId: 'system', // System provider for wallet top-ups
          serviceId: 'wallet_topup',
          redirectUrl: request.redirectUrl || `${window.location.origin}/wallet?topup=success`,
          paymentMethod: 'paypal'
        }
      });

      if (error) {
        throw new Error(`PayPal payment creation failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'PayPal payment creation failed');
      }

      logger.info('PayPal wallet top-up initiated successfully', 'WALLET_PAYPAL', {
        paymentId: data.paymentId,
        paypalOrderId: data.paypalOrderId
      });

      return {
        success: true,
        paymentId: data.paymentId,
        paypalOrderId: data.paypalOrderId,
        paymentUrl: data.paymentUrl,
        message: 'PayPal payment created successfully'
      };

    } catch (error) {
      logger.error('Wallet PayPal top-up failed', 'WALLET_PAYPAL', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create PayPal payment for wallet top-up'
      };
    }
  }

  async capturePayPalPayment(paymentId: string, paypalOrderId: string): Promise<PayPalPaymentResult> {
    try {
      logger.info('Capturing PayPal payment', 'WALLET_PAYPAL', {
        paymentId,
        paypalOrderId
      });

      const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
        body: {
          paymentId,
          paypalOrderId
        }
      });

      if (error) {
        throw new Error(`PayPal capture failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'PayPal capture failed');
      }

      logger.info('PayPal payment captured successfully', 'WALLET_PAYPAL', {
        paymentId: data.paymentId,
        captureId: data.captureId
      });

      return {
        success: true,
        paymentId: data.paymentId,
        message: data.message
      };

    } catch (error) {
      logger.error('PayPal capture failed', 'WALLET_PAYPAL', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to capture PayPal payment'
      };
    }
  }

  async processWalletPayment(userId: string, amount: number, description: string): Promise<boolean> {
    try {
      // Check wallet balance first
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (!wallet || wallet.balance < amount) {
        toast.error('Insufficient wallet balance');
        return false;
      }

      // Process wallet transaction
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_user_id: userId,
        p_transaction_type: 'debit',
        p_amount: amount,
        p_description: description
      });

      if (error) {
        throw error;
      }

      logger.info('Wallet payment processed successfully', 'WALLET_PAYPAL', {
        userId,
        amount,
        description
      });

      return true;

    } catch (error) {
      logger.error('Wallet payment processing failed', 'WALLET_PAYPAL', error);
      toast.error('Wallet payment failed');
      return false;
    }
  }

  async getWalletBalance(userId: string): Promise<number> {
    try {
      const { data: wallet, error } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      return wallet?.balance || 0;

    } catch (error) {
      logger.error('Failed to get wallet balance', 'WALLET_PAYPAL', error);
      return 0;
    }
  }

  async createOrUpdateWallet(userId: string, initialBalance: number = 0): Promise<boolean> {
    try {
      // Check if wallet exists
      const { data: existingWallet } = await supabase
        .from('user_wallets')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingWallet) {
        return true; // Wallet already exists
      }

      // Create new wallet
      const { error } = await supabase
        .from('user_wallets')
        .insert({
          user_id: userId,
          balance: initialBalance,
          currency: 'USD',
          status: 'active',
          created_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      logger.info('Wallet created successfully', 'WALLET_PAYPAL', { userId, initialBalance });
      return true;

    } catch (error) {
      logger.error('Failed to create wallet', 'WALLET_PAYPAL', error);
      return false;
    }
  }

  async getWalletTransactions(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select(`
          id,
          transaction_type,
          amount,
          balance_after,
          description,
          reference_id,
          created_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return transactions || [];

    } catch (error) {
      logger.error('Failed to get wallet transactions', 'WALLET_PAYPAL', error);
      return [];
    }
  }

  async validatePayPalConnection(): Promise<boolean> {
    try {
      // Test PayPal connection by creating a minimal test request
      const testResult = await supabase.functions.invoke('process-paypal-payment', {
        body: {
          amount: 0.01, // Minimal test amount
          currency: 'USD',
          patientId: 'test',
          providerId: 'test',
          serviceId: 'connection_test',
          redirectUrl: window.location.origin,
          paymentMethod: 'paypal'
        }
      });

      // If we get a response (even if it's a mock), the connection is working
      return !testResult.error;

    } catch (error) {
      logger.error('PayPal connection validation failed', 'WALLET_PAYPAL', error);
      return false;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<string | null> {
    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('status')
        .eq('id', paymentId)
        .single();

      if (error) {
        throw error;
      }

      return payment?.status || null;

    } catch (error) {
      logger.error('Failed to get payment status', 'WALLET_PAYPAL', error);
      return null;
    }
  }

  // Handle PayPal return URLs
  async handlePayPalReturn(paymentId: string, paypalOrderId: string, status: string): Promise<boolean> {
    try {
      if (status === 'success') {
        const result = await this.capturePayPalPayment(paymentId, paypalOrderId);
        if (result.success) {
          toast.success('Payment completed successfully!');
          return true;
        } else {
          toast.error('Payment capture failed: ' + result.message);
          return false;
        }
      } else if (status === 'cancelled') {
        // Update payment status to cancelled
        await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', paymentId);

        toast.info('Payment was cancelled');
        return false;
      }

      return false;

    } catch (error) {
      logger.error('Failed to handle PayPal return', 'WALLET_PAYPAL', error);
      toast.error('Failed to process payment return');
      return false;
    }
  }
}

export const walletPayPalIntegration = new WalletPayPalIntegration();
