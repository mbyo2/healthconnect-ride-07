import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface WalletPayInput {
  amount: number;
  currency?: string;
  /** Consultation/service checkout */
  providerId?: string;
  serviceId?: string;
  /** Pharmacy order checkout (total resolved server-side from the order) */
  orderId?: string;
  description?: string;
}

/**
 * Wallet spend rail. Balance is topped up via DPO/PayPal and spent here —
 * previously top-ups worked but nothing could spend the balance.
 * Amounts are re-resolved server-side; the edge function rejects mismatches.
 */
export function useWalletPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);

  const balanceQuery = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return Number((data as any)?.balance || 0);
    },
    enabled: !!user,
  });

  const pay = async (input: WalletPayInput): Promise<boolean> => {
    if (!user) {
      toast.error("Sign in to pay with your wallet.");
      return false;
    }
    if (!(input.amount > 0)) {
      toast.error("Invalid payment amount.");
      return false;
    }
    setPaying(true);
    try {
      // Wallet ledger is ZMW-only: force the currency so a canonical ZMW
      // amount can never be recorded in another currency by mistake.
      const { data, error } = await supabase.functions.invoke("process-wallet-payment", {
        body: {
          amount: input.amount,
          currency: "ZMW",
          patientId: user.id,
          providerId: input.providerId || "00000000-0000-0000-0000-000000000000",
          serviceId: input.serviceId || input.orderId || "wallet_spend",
          orderId: input.orderId,
          description: input.description,
        },
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Wallet payment failed");
      }
      toast.success("Paid from wallet balance.");
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      return true;
    } catch (e: any) {
      const msg = e?.message || "Wallet payment failed";
      if (/insufficient/i.test(msg)) {
        toast.error("Insufficient wallet balance — top up first.");
      } else {
        toast.error(msg);
      }
      return false;
    } finally {
      setPaying(false);
    }
  };

  return {
    balance: balanceQuery.data ?? 0,
    balanceLoading: balanceQuery.isLoading,
    paying,
    pay,
  };
}
