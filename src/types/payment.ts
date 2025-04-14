
export interface PaymentRequest {
  amount: number;
  currency: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  redirectUrl: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl: string;
  paymentId: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}
