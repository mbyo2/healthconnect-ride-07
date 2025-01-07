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