import { 
  PaymentGatewayType, 
  PaymentGatewayConfig, 
  IPaymentGateway, 
  IPaymentGatewayFactory,
  PaymentGatewayRequest,
  PaymentGatewayResponse,
  PaymentGatewayStatus
} from '@/types/payment-gateways';
import { logger } from './logger';
import { errorHandler } from './error-handler';

// Base Payment Gateway Class
abstract class BasePaymentGateway implements IPaymentGateway {
  abstract readonly type: PaymentGatewayType;
  public config: PaymentGatewayConfig;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
  }

  abstract initialize(config: PaymentGatewayConfig): Promise<boolean>;
  abstract createPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
  abstract capturePayment(paymentId: string, gatewayPaymentId: string): Promise<PaymentGatewayResponse>;
  abstract refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentGatewayResponse>;
  abstract getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatus>;
  abstract validateWebhook(payload: any, signature: string): boolean;
  abstract processWebhook(payload: any): Promise<PaymentGatewayStatus>;

  protected logOperation(operation: string, data: any): void {
    logger.info(`${this.type} Gateway: ${operation}`, 'PAYMENT_GATEWAY', data);
  }

  protected logError(operation: string, error: any): void {
    logger.error(`${this.type} Gateway Error: ${operation}`, 'PAYMENT_GATEWAY', error);
  }
}

// PayPal Gateway Implementation
class PayPalGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'paypal';

  async initialize(config: PaymentGatewayConfig): Promise<boolean> {
    try {
      this.config = config;
      this.logOperation('initialize', { enabled: config.enabled, testMode: config.testMode });
      return true;
    } catch (error) {
      this.logError('initialize', error);
      return false;
    }
  }

  async createPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      this.logOperation('createPayment', { amount: request.amount, currency: request.currency });
      
      // This will use the existing PayPal integration
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('process-paypal-payment', {
        body: {
          amount: request.amount,
          currency: request.currency,
          patientId: request.patientId,
          providerId: request.providerId,
          serviceId: request.serviceId,
          redirectUrl: request.redirectUrl,
          paymentMethod: 'paypal'
        }
      });

      if (error) throw error;

      return {
        success: data.success,
        paymentId: data.paymentId,
        gatewayPaymentId: data.paypalOrderId,
        paymentUrl: data.paymentUrl,
        message: data.message
      };
    } catch (error) {
      this.logError('createPayment', error);
      return {
        success: false,
        paymentId: '',
        message: 'PayPal payment creation failed',
        error: error.message
      };
    }
  }

  async capturePayment(paymentId: string, gatewayPaymentId: string): Promise<PaymentGatewayResponse> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
        body: { paymentId, paypalOrderId: gatewayPaymentId }
      });

      if (error) throw error;

      return {
        success: data.success,
        paymentId: data.paymentId,
        message: data.message
      };
    } catch (error) {
      this.logError('capturePayment', error);
      return {
        success: false,
        paymentId,
        message: 'PayPal capture failed',
        error: error.message
      };
    }
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentGatewayResponse> {
    // Implementation for PayPal refunds
    return {
      success: false,
      paymentId,
      message: 'PayPal refunds not implemented yet'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatus> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      return {
        paymentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        completedAt: payment.completed_at,
        metadata: payment.metadata
      };
    } catch (error) {
      this.logError('getPaymentStatus', error);
      throw error;
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    // PayPal webhook validation logic
    return true; // Placeholder
  }

  async processWebhook(payload: any): Promise<PaymentGatewayStatus> {
    // PayPal webhook processing logic
    throw new Error('PayPal webhook processing not implemented');
  }
}

// DPO Pay Gateway Implementation (Placeholder for future use)
class DPOPayGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'dpo';

  async initialize(config: PaymentGatewayConfig): Promise<boolean> {
    try {
      this.config = config;
      this.logOperation('initialize', { enabled: config.enabled, testMode: config.testMode });
      
      // TODO: Initialize DPO Pay API connection when credentials are available
      if (!config.credentials?.companyToken) {
        logger.warn('DPO Pay credentials not configured, gateway disabled', 'PAYMENT_GATEWAY');
        return false;
      }
      
      return true;
    } catch (error) {
      this.logError('initialize', error);
      return false;
    }
  }

  async createPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      this.logOperation('createPayment', { 
        amount: request.amount, 
        currency: request.currency,
        mobileMoneyProvider: request.mobileMoneyProvider 
      });

      // TODO: Implement DPO Pay API integration when credentials are available
      // For now, return a placeholder response
      return {
        success: false,
        paymentId: '',
        message: 'DPO Pay integration not yet configured. Please provide API credentials.',
        error: 'DPO_NOT_CONFIGURED'
      };

      /* Future implementation will look like:
      const dpoRequest = {
        companyToken: this.config.credentials.companyToken,
        amount: request.amount,
        currency: request.currency,
        serviceType: request.serviceId,
        serviceDescription: `HealthConnect Payment`,
        customerEmail: request.metadata?.email,
        customerPhone: request.phoneNumber,
        redirectUrl: request.redirectUrl,
        mobileMoneyProvider: request.mobileMoneyProvider
      };

      const response = await this.callDPOAPI('create-payment', dpoRequest);
      return response;
      */
    } catch (error) {
      this.logError('createPayment', error);
      return {
        success: false,
        paymentId: '',
        message: 'DPO Pay payment creation failed',
        error: error.message
      };
    }
  }

  async capturePayment(paymentId: string, gatewayPaymentId: string): Promise<PaymentGatewayResponse> {
    // TODO: Implement DPO Pay capture when API is available
    return {
      success: false,
      paymentId,
      message: 'DPO Pay capture not yet implemented'
    };
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentGatewayResponse> {
    // TODO: Implement DPO Pay refunds when API is available
    return {
      success: false,
      paymentId,
      message: 'DPO Pay refunds not yet implemented'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatus> {
    // TODO: Implement DPO Pay status check when API is available
    throw new Error('DPO Pay status check not yet implemented');
  }

  validateWebhook(payload: any, signature: string): boolean {
    // TODO: Implement DPO Pay webhook validation
    return false;
  }

  async processWebhook(payload: any): Promise<PaymentGatewayStatus> {
    // TODO: Implement DPO Pay webhook processing
    throw new Error('DPO Pay webhook processing not yet implemented');
  }

  // Private method for future DPO API calls
  private async callDPOAPI(endpoint: string, data: any): Promise<any> {
    // TODO: Implement actual DPO API calls when credentials are available
    throw new Error('DPO API integration pending credentials');
  }
}

// Wallet Gateway Implementation
class WalletGateway extends BasePaymentGateway {
  readonly type: PaymentGatewayType = 'wallet';

  async initialize(config: PaymentGatewayConfig): Promise<boolean> {
    this.config = config;
    return true;
  }

  async createPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse> {
    try {
      const { walletPayPalIntegration } = await import('./wallet-paypal-integration');
      
      const result = await walletPayPalIntegration.processWalletPayment(
        request.patientId,
        request.amount,
        `Payment for service ${request.serviceId}`
      );

      return {
        success: result,
        paymentId: `wallet_${Date.now()}`,
        message: result ? 'Wallet payment successful' : 'Wallet payment failed'
      };
    } catch (error) {
      this.logError('createPayment', error);
      return {
        success: false,
        paymentId: '',
        message: 'Wallet payment failed',
        error: error.message
      };
    }
  }

  async capturePayment(paymentId: string, gatewayPaymentId: string): Promise<PaymentGatewayResponse> {
    // Wallet payments are instant, no capture needed
    return {
      success: true,
      paymentId,
      message: 'Wallet payment already completed'
    };
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentGatewayResponse> {
    // TODO: Implement wallet refunds
    return {
      success: false,
      paymentId,
      message: 'Wallet refunds not yet implemented'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatus> {
    return {
      paymentId,
      status: 'completed',
      amount: 0,
      currency: 'USD'
    };
  }

  validateWebhook(payload: any, signature: string): boolean {
    return true; // Wallet doesn't use webhooks
  }

  async processWebhook(payload: any): Promise<PaymentGatewayStatus> {
    throw new Error('Wallet gateway does not use webhooks');
  }
}

// Payment Gateway Factory
export class PaymentGatewayFactory implements IPaymentGatewayFactory {
  private gateways: Map<PaymentGatewayType, PaymentGatewayConfig> = new Map();

  constructor() {
    this.initializeDefaultGateways();
  }

  private initializeDefaultGateways(): void {
    // PayPal Configuration
    this.gateways.set('paypal', {
      id: 'paypal',
      name: 'PayPal',
      type: 'paypal',
      enabled: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      supportedCountries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES'],
      fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' },
      limits: { min: 1, max: 10000, currency: 'USD' },
      features: [
        { name: 'Credit Cards', supported: true },
        { name: 'PayPal Balance', supported: true },
        { name: 'Bank Transfer', supported: true },
        { name: 'Mobile Payments', supported: false }
      ],
      testMode: true
    });

    // DPO Pay Configuration (Placeholder)
    this.gateways.set('dpo', {
      id: 'dpo',
      name: 'DPO Pay',
      type: 'dpo',
      enabled: false, // Disabled until API credentials are provided
      supportedCurrencies: ['USD', 'KES', 'UGX', 'TZS', 'ZAR', 'GHS', 'XOF', 'XAF'],
      supportedCountries: ['KE', 'UG', 'TZ', 'ZA', 'GH', 'NG', 'CI', 'SN', 'CM', 'BF'],
      fees: { percentage: 3.5, fixed: 0, currency: 'USD' },
      limits: { min: 1, max: 50000, currency: 'USD' },
      features: [
        { name: 'Credit Cards', supported: true },
        { name: 'Mobile Money', supported: true, description: 'MTN, Airtel, Vodacom, Orange' },
        { name: 'Bank Transfer', supported: true },
        { name: 'USSD Payments', supported: true }
      ],
      testMode: true
    });

    // Wallet Configuration
    this.gateways.set('wallet', {
      id: 'wallet',
      name: 'HealthConnect Wallet',
      type: 'wallet',
      enabled: true,
      supportedCurrencies: ['USD'],
      supportedCountries: ['*'], // Available globally
      fees: { percentage: 0, fixed: 0, currency: 'USD' },
      limits: { min: 0.01, max: 10000, currency: 'USD' },
      features: [
        { name: 'Instant Payments', supported: true },
        { name: 'Zero Fees', supported: true },
        { name: 'Balance Management', supported: true }
      ],
      testMode: false
    });
  }

  createGateway(type: PaymentGatewayType): IPaymentGateway {
    const config = this.gateways.get(type);
    if (!config) {
      throw new Error(`Unsupported payment gateway: ${type}`);
    }

    switch (type) {
      case 'paypal':
        return new PayPalGateway(config);
      case 'dpo':
        return new DPOPayGateway(config);
      case 'wallet':
        return new WalletGateway(config);
      default:
        throw new Error(`Gateway implementation not found for: ${type}`);
    }
  }

  getSupportedGateways(): PaymentGatewayType[] {
    return Array.from(this.gateways.keys()).filter(type => 
      this.gateways.get(type)?.enabled
    );
  }

  getGatewayConfig(type: PaymentGatewayType): PaymentGatewayConfig | null {
    return this.gateways.get(type) || null;
  }

  getAllGatewayConfigs(): PaymentGatewayConfig[] {
    return Array.from(this.gateways.values());
  }

  updateGatewayConfig(type: PaymentGatewayType, config: Partial<PaymentGatewayConfig>): void {
    const existingConfig = this.gateways.get(type);
    if (existingConfig) {
      this.gateways.set(type, { ...existingConfig, ...config });
    }
  }

  enableGateway(type: PaymentGatewayType): void {
    this.updateGatewayConfig(type, { enabled: true });
  }

  disableGateway(type: PaymentGatewayType): void {
    this.updateGatewayConfig(type, { enabled: false });
  }
}

export const paymentGatewayFactory = new PaymentGatewayFactory();
