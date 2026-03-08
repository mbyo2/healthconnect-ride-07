import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useRedeemPromoCode } from "@/hooks/usePromoCodes";
import { Ticket, Loader2, CheckCircle } from "lucide-react";

interface PromoCodeRedeemProps {
  context?: string;
  onRedeemed?: (result: { discount_type: string; discount_value: number; promo_code_id: string }) => void;
}

export const PromoCodeRedeem = ({ context = "subscription", onRedeemed }: PromoCodeRedeemProps) => {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ type: string; value: number } | null>(null);
  const redeem = useRedeemPromoCode();

  const handleRedeem = async () => {
    if (!code.trim()) return;
    try {
      const result = await redeem.mutateAsync({ code, context });
      setApplied({ type: result.discount_type, value: result.discount_value });
      onRedeemed?.(result);
    } catch {
      // error handled in hook
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span className="text-sm text-green-800 font-medium">
          Code applied: {applied.type === 'percentage' ? `${applied.value}% off` :
            applied.type === 'free_trial_days' ? `${applied.value} extra trial days` :
            `K${applied.value} credit`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter promo code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="pl-9 font-mono"
          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
        />
      </div>
      <Button variant="outline" size="sm" onClick={handleRedeem} disabled={redeem.isPending || !code.trim()}>
        {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </Button>
    </div>
  );
};
