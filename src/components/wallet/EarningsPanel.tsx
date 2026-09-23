import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Provider earnings — what this clinician/pharmacy has earned through
 * platform splits. Separate from the spendable personal wallet below:
 * earnings land in the wallet, this panel explains where they came from.
 */
export const EarningsPanel = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payoutCount, setPayoutCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const { data, error } = await supabase
          .from("payment_splits")
          .select("amount, created_at, status")
          .eq("recipient_id", user.id)
          .neq("recipient_type", "app_owner")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        const rows = (data as any[]) || [];
        setTotalEarnings(rows.reduce((s, r) => s + Number(r.amount || 0), 0));
        setMonthEarnings(
          rows
            .filter((r) => new Date(r.created_at) >= monthStart)
            .reduce((s, r) => s + Number(r.amount || 0), 0)
        );
        setPayoutCount(rows.length);
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-success-500" aria-hidden />
          Provider Earnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-3" role="status" aria-label="Loading earnings">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" aria-hidden />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-success-500/10">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">This month</p>
              <p className="text-lg font-black text-success-600">{formatPrice(monthEarnings)}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-500/10">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">All time</p>
              <p className="text-lg font-black text-primary-600">{formatPrice(totalEarnings)}</p>
            </div>
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Payouts</p>
              <p className="text-lg font-black flex items-center justify-center gap-1">
                <Wallet className="h-4 w-4" aria-hidden />
                {payoutCount}
              </p>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Earnings settle into your wallet balance after the platform fee. Withdrawals are arranged through finance.
        </p>
      </CardContent>
    </Card>
  );
};
