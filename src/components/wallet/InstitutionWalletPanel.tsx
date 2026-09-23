import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Facility wallet — the institution's collected revenue share. Only visible
 * to users affiliated with the institution; backed by institution_wallets,
 * never mixed with anyone's personal balance.
 */
export const InstitutionWalletPanel = ({ institutionId, institutionName }: { institutionId: string; institutionName?: string }) => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("institution_wallets")
          .select("balance")
          .eq("institution_id", institutionId)
          .maybeSingle();
        if (error) throw error;
        setBalance(Number((data as any)?.balance ?? 0));
      } catch (error) {
        console.error("Error fetching institution wallet:", error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`institution-wallet-${institutionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "institution_wallets", filter: `institution_id=eq.${institutionId}` },
        (payload) => {
          const row = payload.new as any;
          if (row && typeof row.balance !== "undefined") setBalance(Number(row.balance));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [institutionId]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5 text-primary-500" aria-hidden />
          {institutionName ? `${institutionName} Wallet` : "Institution Wallet"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-12 rounded-xl bg-muted animate-pulse" role="status" aria-label="Loading institution wallet" />
        ) : balance === null ? (
          <p className="text-sm text-muted-foreground">
            Institution wallet isn't available — it appears after the first settled payment.
          </p>
        ) : (
          <>
            <p className="text-3xl font-black tabular-nums">{formatPrice(balance)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Facility revenue share. Personal spending stays in your own wallet below.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
