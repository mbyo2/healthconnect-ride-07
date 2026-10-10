import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LencoOperator = "mtn" | "airtel" | "zamtel" | "tnm";

export interface LencoCollectionInput {
  amount: number;
  currency?: string; // default ZMW
  reference_type: "booking_fee" | "subscription" | "pharmacy_sale" | "consultation" | "wallet_topup" | string;
  reference_id?: string | null;
  description?: string;
  /** Customer's mobile-money MSISDN, e.g. 0971234567 or +260971234567 */
  phone: string;
  operator: LencoOperator;
  country?: string; // 'zm' | 'mw', default 'zm'
}

export interface LencoCollectionResult {
  reference: string;
  collection_id: string | null;
  status: string; // pay_offline | paid | failed
  lenco_status: string | null;
  account_name: string | null;
  payment_id?: string;
  message?: string;
}

export interface LencoVerifyResult {
  status: "paid" | "pending" | "failed" | "cancelled";
  payment: any;
  settlement: any;
  message?: string;
}

export const LENCO_OPERATORS: { value: LencoOperator; label: string; hint: string }[] = [
  { value: "mtn", label: "MTN MoMo", hint: "096 / 076" },
  { value: "airtel", label: "Airtel Money", hint: "097 / 077" },
  { value: "zamtel", label: "Zamtel Kwacha", hint: "095" },
];

/**
 * Lenco mobile-money collections hook (Zambia: MTN / Airtel / Zamtel).
 * Flow: createCollection() pushes an authorization prompt to the customer's
 * phone -> customer approves on the phone -> verifyPayment() (poll) confirms
 * and the wallet is credited server-side.
 */
export function useLencoPayment() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const createCollection = async (input: LencoCollectionInput): Promise<LencoCollectionResult | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lenco-create-payment", {
        body: {
          amount: input.amount,
          currency: input.currency || "ZMW",
          reference_type: input.reference_type,
          reference_id: input.reference_id || null,
          description: input.description,
          phone: input.phone,
          operator: input.operator,
          country: input.country || "zm",
        },
      });
      if (error) {
        let details = error?.message || "Lenco mobile money unavailable";
        try {
          const body = await (error.context as Response)?.json?.();
          if (body?.message || body?.error) details = body.message ? `${body.error} (${body.message})` : body.error;
        } catch {
          /* keep original */
        }
        console.error("Lenco createCollection API error:", details);
        toast.error(`Mobile money unavailable: ${details}. Please try PayPal or wallet balance.`);
        return null;
      }
      if (!data?.reference) {
        toast.error("Could not start the mobile money payment. Please try PayPal or wallet balance.");
        return null;
      }
      return data as LencoCollectionResult;
    } catch (e: any) {
      console.error("Lenco createCollection error", e);
      toast.error(`Payment error: ${e?.message || "Failed to start payment"}. Please try PayPal or wallet balance.`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string): Promise<LencoVerifyResult | null> => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("lenco-verify-payment", {
        body: { reference },
      });
      if (error) throw error;
      return data as LencoVerifyResult;
    } catch (e: any) {
      console.error("Lenco verifyPayment error", e);
      toast.error(e?.message || "Could not check payment status yet. Try again in a few seconds.");
      return null;
    } finally {
      setVerifying(false);
    }
  };

  return { loading, verifying, createCollection, verifyPayment };
}
