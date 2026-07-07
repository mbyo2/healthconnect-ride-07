import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DPOCheckoutInput {
  amount: number;
  currency?: string; // ZMW, USD, KES, etc.
  reference_type: "booking_fee" | "subscription" | "pharmacy_sale" | "consultation" | string;
  reference_id?: string | null;
  description?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone?: string;
  /** Where DPO returns the user after payment. Defaults to `${origin}/payment-return`. */
  redirect_url?: string;
  back_url?: string;
}

export interface DPOCheckoutResult {
  trans_token: string;
  trans_ref: string;
  redirect_url: string;
  payment_id?: string;
}

/**
 * DPO Pay integration hook. Creates a payment token and returns the hosted
 * checkout URL the browser should redirect to.
 */
export function useDPOPayment() {
  const [loading, setLoading] = useState(false);

  const createCheckout = async (input: DPOCheckoutInput): Promise<DPOCheckoutResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dpo-create-token", {
        body: {
          amount: input.amount,
          currency: input.currency || "ZMW",
          reference_type: input.reference_type,
          reference_id: input.reference_id || null,
          description: input.description,
          customer_first_name: input.customer_first_name,
          customer_last_name: input.customer_last_name,
          customer_phone: input.customer_phone,
          redirect_url: input.redirect_url || `${window.location.origin}/payment-return`,
          back_url: input.back_url || `${window.location.origin}/payment-cancelled`,
        },
      });
      if (error) throw error;
      if (!data?.redirect_url) throw new Error("No redirect URL returned");
      return data as DPOCheckoutResult;
    } catch (e: any) {
      console.error("DPO createCheckout error", e);
      toast.error(e?.message || "Failed to start payment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (transToken: string) => {
    const { data, error } = await supabase.functions.invoke("dpo-verify-token", {
      body: { trans_token: transToken },
    });
    if (error) throw error;
    return data as { status: string; code: string; message: string; payment: any };
  };

  const redirectToCheckout = async (input: DPOCheckoutInput) => {
    const res = await createCheckout(input);
    if (res) window.location.href = res.redirect_url;
  };

  return { loading, createCheckout, verifyToken, redirectToCheckout };
}
