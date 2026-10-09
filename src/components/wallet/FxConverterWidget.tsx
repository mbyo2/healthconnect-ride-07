import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, RefreshCw, TrendingUp } from "lucide-react";
import {
  getRates,
  refreshRates,
  toZmw,
  roundForCurrency,
  BASE_CURRENCY,
} from "@/services/exchangeRates";

const WATCH = ["USD", "EUR", "GBP", "ZAR", "KES", "NGN"] as const;

function timeAgo(ts: number): string {
  if (!ts) return "using indicative rates";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * Live FX panel: real-time foreign → ZMW rates plus a "what you'll
 * receive" converter. Settlement is always ZMW; this shows the math
 * before money moves. Rates: open.er-api.com (free, no key).
 */
export function FxConverterWidget() {
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState("100");
  const [fromCode, setFromCode] = useState("USD");

  // Re-render when background refresh completes
  useEffect(() => {
    let cancelled = false;
    refreshRates().then(() => { if (!cancelled) setTick((t) => t + 1); });
    return () => { cancelled = true; };
  }, []);

  const snap = getRates();
  const zmwValue = roundForCurrency(toZmw(parseFloat(amount) || 0, fromCode), BASE_CURRENCY);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRates(true);
    setRefreshing(false);
    setTick((t) => t + 1);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" aria-hidden />
            Live exchange rates
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={snap.live ? "default" : "secondary"} className="text-xs">
              <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${snap.live ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} aria-hidden />
              {snap.live ? "Live" : "Indicative"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh rates">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Foreign currency → ZMW · updated {timeAgo(snap.updatedAt)} · settlement is always ZMW
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate ticker */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" key={tick}>
          {WATCH.map((code) => {
            const perUnit = snap.rates[code] ? 1 / snap.rates[code] : 0;
            return (
              <div key={code} className="rounded-xl border bg-muted/40 px-2.5 py-2 text-center">
                <div className="text-[11px] font-semibold text-muted-foreground">{code}</div>
                <div className="text-sm font-bold tabular-nums flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" aria-hidden />
                  {perUnit ? `K${perUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                </div>
              </div>
            );
          })}
        </div>

        {/* You'll-receive converter */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold mb-3">What you'll receive</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sm:w-36 tabular-nums"
              aria-label="Foreign amount"
            />
            <Select value={fromCode} onValueChange={setFromCode}>
              <SelectTrigger className="sm:w-28" aria-label="Foreign currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(snap.rates)
                  .filter((c) => c !== "ZMW")
                  .sort()
                  .slice(0, 40)
                  .map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground mx-1 shrink-0" aria-hidden />
            <div className="flex-1 rounded-lg bg-background border px-4 py-2.5">
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                K{zmwValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground ml-2">ZMW you'll receive</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Converted at the {snap.live ? "live mid-market rate" : "indicative rate"} shown above.
            Final settlement may vary slightly by payment rail.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
