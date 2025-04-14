
export interface PaymentRequest {
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  redirectUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  message?: string;
  paymentUrl?: string;
  transactionDetails?: {
    amount: number;
    currency: string;
    date: string;
    method: string;
  };
}

export interface RefundRequest {
  paymentId: string;
  reason?: string;
  amount?: number; // If partial refund
  initiatedBy: string;
}

export interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  currency: string;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money' | 'bank_transfer';
  details: {
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    provider?: string;
    accountName?: string;
    bankName?: string;
  };
  isDefault: boolean;
  created_at: string;
}
