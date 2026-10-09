import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { HeartPulse, Activity, Thermometer, Scale, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Metric {
  key: string;
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  recordedAt: string;
}

const CARD_STYLES = [
  "bg-primary-500/[0.08] dark:bg-primary-500/10 text-primary-700 dark:text-primary-300",
  "bg-emerald-500/[0.08] dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/[0.08] dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "bg-sky-500/[0.08] dark:bg-sky-500/10 text-sky-700 dark:text-sky-300",
];

/**
 * "Your health" — glanceable metric cards from the patient's latest recorded
 * vitals (reference image: Find-your-doctor "Your health" tiles). Only real
 * recorded data is shown; with no vitals on file the section stays honest
 * with an empty state instead of placeholder numbers.
 */
export function HealthMetricCards() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setMetrics([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("vital_signs")
          .select(
            "heart_rate, blood_pressure_systolic, blood_pressure_diastolic, temperature, weight, recorded_at"
          )
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!data) {
          setMetrics([]);
          return;
        }
        const out: Metric[] = [];
        if (data.heart_rate)
          out.push({
            key: "hr", label: "Heart rate", value: String(data.heart_rate),
            unit: "bpm", icon: HeartPulse, recordedAt: data.recorded_at,
          });
        if (data.blood_pressure_systolic && data.blood_pressure_diastolic)
          out.push({
            key: "bp", label: "Blood pressure",
            value: `${data.blood_pressure_systolic}/${data.blood_pressure_diastolic}`,
            unit: "mmHg", icon: Activity, recordedAt: data.recorded_at,
          });
        if (data.temperature)
          out.push({
            key: "temp", label: "Temperature", value: String(data.temperature),
            unit: "°C", icon: Thermometer, recordedAt: data.recorded_at,
          });
        if (data.weight)
          out.push({
            key: "weight", label: "Weight", value: String(data.weight),
            unit: "kg", icon: Scale, recordedAt: data.recorded_at,
          });
        setMetrics(out);
      } catch {
        if (!cancelled) setMetrics([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (metrics === null) {
    return (
      <section aria-label="Your health" className="space-y-3">
        <h2 className="text-lg font-bold text-midnight">Your health</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (metrics.length === 0) return null;

  return (
    <section aria-label="Your health" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-midnight">Your health</h2>
        <p className="text-xs text-graphite-500">
          Last recorded{" "}
          {formatDistanceToNow(new Date(metrics[0].recordedAt), { addSuffix: true })}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className={cn(
                "rounded-2xl border border-canvas-silk dark:border-slate-800 p-4 min-h-[112px]",
                "flex flex-col justify-between bg-white dark:bg-slate-900"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  CARD_STYLES[i % CARD_STYLES.length]
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-graphite-500 dark:text-slate-400">
                  {m.label}
                </p>
                <p className="text-2xl font-extrabold text-midnight dark:text-white leading-tight">
                  {m.value}
                  <span className="text-xs font-bold text-graphite-500 ml-1">{m.unit}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
