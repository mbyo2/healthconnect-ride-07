import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, ShieldCheck, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

interface CostBreakdownProps {
  appointmentType: "physical" | "virtual";
  visitType: "new" | "returning";
  specialty?: string;
  /** Real published fees from the provider directory (ZMW). The displayed
      total is the provider's actual listed fee — never an invented
      specialty-table price, and never discounted by visit type. */
  feeMin?: number | null;
  feeMax?: number | null;
}

export const CostBreakdown = ({ feeMin, feeMax }: CostBreakdownProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insurance, setInsurance] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: ins } = await supabase
        .from("insurance_information")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setInsurance(ins);
      if (ins?.id) {
        const { data: v } = await supabase
          .from("insurance_verifications")
          .select("*")
          .eq("insurance_info_id", ins.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setVerification(v);
      }
      setLoading(false);
    })();
  }, [user]);

  // The displayed total is the provider's actual listed fee, exactly —
  // the same for virtual and in-person, new and returning visits. When
  // the provider has published no fee there is nothing honest to
  // estimate against, so no totals are shown at all.
  const listedFee = feeMin ?? feeMax ?? null;

  // Insurance math comes ONLY from a real insurance_verifications row.
  // An insurance_information record on its own proves nothing about
  // coverage — no default percentages, copays or deductibles are shown.
  const coveragePercent = verification?.coverage_percentage ?? 0;
  const copay = verification?.copay_amount ?? 0;
  const deductibleRemaining = verification?.deductible_remaining ?? 0;

  const total = listedFee ?? 0;
  const insuranceCovers = verification ? Math.round(total * (coveragePercent / 100)) : 0;
  const deductibleApplied = verification ? Math.min(deductibleRemaining, Math.max(0, total - copay)) : 0;
  const outOfPocket = verification
    ? Math.max(copay, Math.round(total - insuranceCovers + deductibleApplied))
    : total;

  if (loading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </Card>
    );
  }

  if (listedFee === null) {
    // Honest unset state: the provider hasn't published a fee, so there
    // are no Service total / You pay figures and no insurance math.
    return (
      <Card className="p-4 space-y-3 border-primary/20 bg-primary/[0.02]">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Estimated Cost
          </h4>
        </div>

        <p className="text-sm font-medium text-foreground">
          Your provider&apos;s fee: Fee confirmed at booking
        </p>
        <p className="text-sm text-muted-foreground">
          This provider hasn&apos;t published a fee yet. The exact fee is
          confirmed when they accept your booking.
        </p>

        {!insurance && (
          <Link
            to="/insurance-cards"
            className="flex items-center gap-2 text-xs text-primary hover:underline p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            Add insurance to get coverage estimates
          </Link>
        )}

        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          Estimate only. Final cost depends on services rendered and verified coverage.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3 border-primary/20 bg-primary/[0.02]">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Estimated Cost
        </h4>
        {verification ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Insured
          </Badge>
        ) : insurance ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Insured — coverage not verified
          </Badge>
        ) : (
          <Badge variant="outline">Self-pay</Badge>
        )}
      </div>

      <p className="text-sm font-medium text-foreground">
        {feeMin != null && feeMax != null && feeMin !== feeMax
          ? `Your provider's fee: K${feeMin} – K${feeMax}`
          : `Your provider's fee: K${feeMin ?? feeMax}`}
      </p>

      {!insurance && (
        <Link
          to="/insurance-cards"
          className="flex items-center gap-2 text-xs text-primary hover:underline p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg"
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          Add insurance to get coverage estimates
        </Link>
      )}

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service total</span>
          <span className="font-medium text-foreground">K{total.toFixed(2)}</span>
        </div>
        {verification && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Insurance covers ({coveragePercent}%)
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                −K{insuranceCovers.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Copay</span>
              <span className="font-medium text-foreground">K{copay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductible applied</span>
              <span className="font-medium text-foreground">K{deductibleApplied.toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <span className="font-semibold text-foreground">You pay</span>
          <span className="font-bold text-lg text-primary">K{outOfPocket.toFixed(2)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
        Estimate only. Final cost depends on services rendered and verified coverage.
        {insurance && !verification && (
          <> Coverage hasn&apos;t been verified yet — this estimate assumes you pay the full fee.</>
        )}
      </p>
    </Card>
  );
};
