
import { supabase } from "@/integrations/supabase/client";
import { PaymentRequest, PaymentResponse, RefundRequest } from "@/types/payment";
import { PaymentGatewayType, PaymentGatewayRequest } from "@/types/payment-gateways";
import { paymentGatewayFactory } from "./payment-gateway-factory";
import { toast } from "sonner";

// Extended payment request that supports gateway types
export interface ExtendedPaymentRequest extends PaymentRequest {
  gatewayType?: PaymentGatewayType;
  gatewayOptions?: Record<string, any>;
  description?: string;
  appointmentId?: string;
}

// Extended payment response that supports additional fields
export interface ExtendedPaymentResponse extends PaymentResponse {
  approvalUrl?: string;
  transactionId?: string;
  receiptUrl?: string;
  status?: string;
}

export const processPayment = async (paymentDetails: ExtendedPaymentRequest): Promise<ExtendedPaymentResponse> => {
  try {
    // Use gateway factory if gatewayType is specified
    if (paymentDetails.gatewayType) {
      const gateway = paymentGatewayFactory.createGateway(paymentDetails.gatewayType);
      if (gateway) {
        const gatewayRequest: PaymentGatewayRequest = {
          gatewayType: paymentDetails.gatewayType,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
          patientId: paymentDetails.patientId,
          providerId: paymentDetails.providerId,
          serviceId: paymentDetails.serviceId,
          redirectUrl: paymentDetails.redirectUrl || window.location.origin + '/payment/callback',
          metadata: {
            description: paymentDetails.description,
            appointmentId: paymentDetails.appointmentId,
            ...paymentDetails.gatewayOptions
          }
        };

        const result = await gateway.createPayment(gatewayRequest);
        return {
          success: result.success,
          paymentId: result.paymentId,
          message: result.message,
          paymentUrl: result.paymentUrl,
          error: result.error,
          approvalUrl: result.paymentUrl,
          transactionId: result.gatewayPaymentId
        };
      }
    }

    // Legacy payment processing
    const paymentData = {
      amount: paymentDetails.amount,
      currency: paymentDetails.currency,
      patient_id: paymentDetails.patientId,
      provider_id: paymentDetails.providerId,
      service_id: paymentDetails.serviceId,
      payment_method: paymentDetails.paymentMethod || 'card'
    };

    let functionName = 'process-payment';
    if (paymentDetails.paymentMethod === 'paypal') {
      functionName = 'process-paypal-payment';
    } else if (paymentDetails.paymentMethod === 'wallet') {
      functionName = 'process-wallet-payment';
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: paymentData
    });

    if (error) {
      return { success: false, error: error.message || 'Payment processing failed' };
    }

    return {
      success: true,
      paymentId: data.paymentId,
      message: data.message,
      paymentUrl: data.paymentUrl || data.approvalUrl,
      approvalUrl: data.approvalUrl,
      transactionId: data.transactionId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed'
    };
  }
};

export const processWalletPayment = async (paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-wallet-payment', {
      body: paymentDetails
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error processing wallet payment:', error);
    throw error;
  }
};

export const processRefund = async (refundDetails: RefundRequest): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-refund', {
      body: refundDetails
    });

    if (error) throw error;
    return data.success;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

export const generateReceipt = async (paymentId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-receipt', {
      body: { paymentId }
    });

    if (error) throw error;
    
    // Download receipt
    const { data: receiptData, error: downloadError } = await supabase
      .storage
      .from('receipts')
      .download(`${paymentId}.pdf`);

    if (downloadError) throw downloadError;

    // Create blob and download
    const blob = new Blob([receiptData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${paymentId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating receipt:', error);
    toast.error('Failed to generate receipt');
    throw error;
  }
};
