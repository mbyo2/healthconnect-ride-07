// Payment Gateway Types and Interfaces for HealthConnect
// Designed for easy extension with new payment providers

export type PaymentGatewayType = 'paypal' | 'dpo' | 'stripe' | 'flutterwave' | 'wallet' | 'mobile_money';

export type MobileMoneyProvider = 'mtn' | 'airtel' | 'vodacom' | 'orange' | 'tigo' | 'mpesa';

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: PaymentGatewayType;
  enabled: boolean;
  supportedCurrencies: string[];
  supportedCountries: string[];
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  limits: {
    min: number;
    max: number;
    currency: string;
  };
  features: PaymentFeature[];
  credentials?: Record<string, string>;
  testMode: boolean;
}

export interface PaymentFeature {
  name: string;
  supported: boolean;
  description?: string;
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  type: PaymentGatewayType;
  icon: string;
  description: string;
  enabled: boolean;
  processingTime: string;
  fees: string;
  supportedRegions: string[];
  mobileMoneyProviders?: MobileMoneyProvider[];
}

export interface PaymentGatewayRequest {
  gatewayType: PaymentGatewayType;
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  redirectUrl: string;
  metadata?: Record<string, any>;
  mobileMoneyProvider?: MobileMoneyProvider;
  phoneNumber?: string; // For mobile money
}

export interface PaymentGatewayResponse {
  success: boolean;
  paymentId: string;
  gatewayPaymentId?: string;
  paymentUrl?: string;
  qrCode?: string; // For QR-based payments
  ussdCode?: string; // For USSD-based payments
  message: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PaymentGatewayStatus {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
  gatewayStatus?: string;
  amount: number;
  currency: string;
  fees?: number;
  netAmount?: number;
  completedAt?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface MobileMoneyPayment {
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  currency: string;
  reference: string;
  instructions?: string;
  ussdCode?: string;
  confirmationRequired: boolean;
}

// DPO Pay specific types
export interface DPOPayRequest extends PaymentGatewayRequest {
  companyToken: string;
  serviceType: string;
  serviceDescription: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  customerZip?: string;
}

export interface DPOPayResponse extends PaymentGatewayResponse {
  transactionToken?: string;
  paymentUrl?: string;
  mobileMoneyInstructions?: MobileMoneyPayment;
}

// Payment Gateway Interface that all gateways must implement
export interface IPaymentGateway {
  readonly type: PaymentGatewayType;
  readonly config: PaymentGatewayConfig;
  
  initialize(config: PaymentGatewayConfig): Promise<boolean>;
  createPayment(request: PaymentGatewayRequest): Promise<PaymentGatewayResponse>;
  capturePayment(paymentId: string, gatewayPaymentId: string): Promise<PaymentGatewayResponse>;
  refundPayment(paymentId: string, amount?: number, reason?: string): Promise<PaymentGatewayResponse>;
  getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatus>;
  validateWebhook(payload: any, signature: string): boolean;
  processWebhook(payload: any): Promise<PaymentGatewayStatus>;
}

// Gateway Factory Interface
export interface IPaymentGatewayFactory {
  createGateway(type: PaymentGatewayType): IPaymentGateway;
  getSupportedGateways(): PaymentGatewayType[];
  getGatewayConfig(type: PaymentGatewayType): PaymentGatewayConfig | null;
}
