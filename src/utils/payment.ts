
import { supabase } from "@/integrations/supabase/client";
import { PaymentRequest, PaymentResponse, RefundRequest } from "@/types/payment";
import { toast } from "sonner";

export const processPayment = async (paymentDetails: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: paymentDetails
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error processing payment:', error);
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
