import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Platform (app owner) wallet — collected platform fees. Rendered only for
 * platform admins; RLS is the enforcement layer, this is just the view.
 */
export const PlatformWalletPanel = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("app_owner_wallet")
          .select("balance")
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        setBalance(Number((data as any)?.balance ?? 0));
      } catch (error) {
        console.error("Error fetching platform wallet:", error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!loading && balance === null) return null;

  return (
    <Card className="border-primary-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-5 w-5 text-primary-500" aria-hidden />
          Platform Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-12 rounded-xl bg-muted animate-pulse" role="status" aria-label="Loading platform wallet" />
        ) : (
          <>
            <p className="text-3xl font-black tabular-nums">{formatPrice(balance ?? 0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Collected platform fees across all payment rails.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
