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