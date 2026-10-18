import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, RefreshCw, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// NEWS2 (National Early Warning Score 2) — honest, transparent scoring.
// This is a screening aid, NOT a diagnosis and NOT an "AI prediction".
// Every component score is shown so clinicians see the reasoning.

interface ParamScore {
  name: string;
  value: string;
  score: number;
  max: number;
  assessed: boolean;
}

function scoreRespRate(v: number | null): ParamScore {
  if (v === null) return { name: "Respiratory rate", value: "Not recorded", score: 0, max: 3, assessed: false };
  const s = v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3;
  return { name: "Respiratory rate", value: `${v}/min`, score: s, max: 3, assessed: true };
}
function scoreSpO2(v: number | null): ParamScore {
  if (v === null) return { name: "Oxygen saturation", value: "Not recorded", score: 0, max: 3, assessed: false };
  const s = v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0;
  return { name: "Oxygen saturation", value: `${v}%`, score: s, max: 3, assessed: true };
}
function scoreTemp(v: number | null): ParamScore {
  if (v === null) return { name: "Temperature", value: "Not recorded", score: 0, max: 3, assessed: false };
  const s = v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2;
  return { name: "Temperature", value: `${v}°C`, score: s, max: 3, assessed: true };
}
function scoreSysBP(v: number | null): ParamScore {
  if (v === null) return { name: "Systolic BP", value: "Not recorded", score: 0, max: 3, assessed: false };
  const s = v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3;
  return { name: "Systolic BP", value: `${v} mmHg`, score: s, max: 3, assessed: true };
}
function scoreHeartRate(v: number | null): ParamScore {
  if (v === null) return { name: "Heart rate", value: "Not recorded", score: 0, max: 3, assessed: false };
  const s = v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3;
  return { name: "Heart rate", value: `${v} bpm`, score: s, max: 3, assessed: true };
}

type RiskLevel = "low" | "medium" | "high";

function riskOf(total: number, hasSingle3: boolean): RiskLevel {
  if (total >= 7) return "high";
  if (total >= 5 || (total >= 3 && hasSingle3)) return "medium";
  return "low";
}

const RISK_META: Record<RiskLevel, { label: string; className: string; advice: string }> = {
  low: {
    label: "Low risk",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    advice: "Continue routine monitoring.",
  },
  medium: {
    label: "Medium risk",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    advice: "Increase monitoring frequency and inform the nurse in charge.",
  },
  high: {
    label: "High risk",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    advice: "Urgent clinical review required — escalate to the doctor on duty now.",
  },
};

export default function DeteriorationScores({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<ParamScore[] | null>(null);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);

  const calculate = async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vital_signs")
        .select("blood_pressure_systolic, heart_rate, temperature, oxygen_saturation, respiratory_rate, recorded_at")
        .eq("user_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.info("No vital signs recorded for this patient yet");
        setParams(null);
        return;
      }
      const ps = [
        scoreRespRate(data.respiratory_rate),
        scoreSpO2(data.oxygen_saturation),
        scoreTemp(data.temperature),
        scoreSysBP(data.blood_pressure_systolic),
        scoreHeartRate(data.heart_rate),
      ];
      setParams(ps);
      setRecordedAt(data.recorded_at);
    } catch (e: any) {
      toast.error(e?.message || "Could not load vital signs");
    } finally {
      setLoading(false);
    }
  };

  const total = params ? params.reduce((a, p) => a + p.score, 0) : 0;
  const hasSingle3 = params ? params.some((p) => p.assessed && p.score === 3) : false;
  const risk: RiskLevel = riskOf(total, hasSingle3);
  const meta = RISK_META[risk];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-[18px] flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Early Warning Score
          </CardTitle>
          <Button variant="outline" size="sm" onClick={calculate} disabled={loading} className="min-h-[44px]">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {params ? "Recalculate" : "Calculate"}
          </Button>
        </div>
        <p className="text-[13px] text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          NEWS2-based screening aid from the latest recorded vitals. Not a diagnosis — always use clinical judgement.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!params && !loading && (
          <p className="text-[15px] text-muted-foreground">
            Calculate a score from the patient's most recent vital signs.
          </p>
        )}

        {params && (
          <>
            <div className="flex items-center gap-3">
              <div className="text-[34px] font-bold tabular-nums leading-none">{total}</div>
              <div>
                <Badge className={meta.className}>{meta.label} ({total}/15)</Badge>
                {recordedAt && (
                  <p className="text-[13px] text-muted-foreground mt-1">
                    From vitals recorded {new Date(recordedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {risk === "high" && (
              <div className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-[15px] font-medium text-red-800 dark:text-red-200">{meta.advice}</p>
              </div>
            )}
            {risk === "medium" && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4">
                <p className="text-[15px] text-amber-800 dark:text-amber-200">{meta.advice}</p>
              </div>
            )}

            <div className="space-y-2">
              {params.map((p) => (
                <div key={p.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-[15px] font-medium">{p.name}</p>
                    <p className="text-[13px] text-muted-foreground">{p.value}</p>
                  </div>
                  <Badge variant={p.score >= 2 ? "destructive" : p.score === 1 ? "secondary" : "outline"} className="tabular-nums">
                    {p.assessed ? `${p.score}` : "—"}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">
              Consciousness and supplemental oxygen are not yet captured in vitals — score is based on the 5 recorded parameters (max 15).
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
