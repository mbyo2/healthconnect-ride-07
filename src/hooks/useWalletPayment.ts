import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  savePendingAction,
  authRedirectUrl,
  currentReturnTo,
} from "@/utils/pendingAction";

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
  const navigate = useNavigate();
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
      // Auth wall: remember where the checkout lives so login returns here.
      // The payment itself is NEVER auto-retried — the user taps pay again.
      const returnTo = currentReturnTo();
      savePendingAction({
        kind: 'checkout',
        returnTo,
        label: input.description || 'wallet checkout',
        createdAt: Date.now(),
      });
      toast.info('Sign in to continue checkout — nothing has been charged.');
      navigate(authRedirectUrl(returnTo));
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
          providerId: input.providerId || null,
          serviceId: input.serviceId || null,
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
