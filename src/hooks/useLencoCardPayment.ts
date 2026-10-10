import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LencoCardInput {
  amount: number;
  currency?: string;
  reference_type: string;
  reference_id?: string | null;
  description?: string;
  email: string;
  firstName: string;
  lastName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  billingStreet?: string;
  billingCity?: string;
  billingPostalCode?: string;
  billingCountry?: string; // 2-letter, default "ZM"
}

export interface LencoCardResult {
  reference: string;
  status: "paid" | "pending" | "3ds_required";
  redirectUrl?: string;
  card_last4?: string;
  message?: string;
}

/**
 * Lenco card collections hook.
 * Flow: card details are encrypted server-side via JWE (never stored/logged).
 * May return 3ds_required with a redirect URL for 3D Secure authentication.
 * After 3DS, verify with lenco-verify-payment using the reference.
 */
export function useLencoCardPayment() {
  const [loading, setLoading] = useState(false);

  const payWithCard = async (input: LencoCardInput): Promise<LencoCardResult | null> => {
    setLoading(true);
    try {
      // Basic client-side validation
      const digits = input.cardNumber.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) {
        toast.error("Invalid card number");
        return null;
      }
      if (!/^\d{3,4}$/.test(input.cvv)) {
        toast.error("Invalid CVV");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("lenco-create-card-payment", {
        body: {
          amount: input.amount,
          currency: input.currency || "ZMW",
          reference_type: input.reference_type,
          reference_id: input.reference_id || null,
          description: input.description,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          card: {
            number: input.cardNumber,
            expiryMonth: input.expiryMonth,
            expiryYear: input.expiryYear,
            cvv: input.cvv,
          },
          billing: {
            streetAddress: input.billingStreet || "N/A",
            city: input.billingCity || "Lusaka",
            postalCode: input.billingPostalCode || "10101",
            country: input.billingCountry || "ZM",
          },
          redirectUrl: `${window.location.origin}/payment-complete`,
        },
      });

      if (error) {
        console.error("Lenco card payment error:", error.message);
        toast.error("Card payment failed. Please try again or use mobile money.");
        return null;
      }

      if (!data?.reference) {
        toast.error("Could not process card payment. Please try mobile money.");
        return null;
      }

      return data as LencoCardResult;
    } catch (e: any) {
      console.error("Lenco card payment error", e);
      toast.error("Card payment failed. Please try mobile money.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { loading, payWithCard };
}
