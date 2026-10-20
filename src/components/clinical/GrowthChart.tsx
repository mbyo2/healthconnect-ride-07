import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";
import {
  zScore, zToPercentile, classifyZ, STATUS_LABEL, ageMonthsAt, referenceCurves,
} from "@/utils/growth-charts";

/**
 * WHO Pediatric Growth Chart (0–5 years)
 * Plots the child's weight from vital_signs against the WHO 2006
 * weight-for-age standard (median with ±1SD and ±2SD bands) and
 * reports the latest z-score / percentile / nutritional status.
 */
export default function GrowthChart({ patientId }: { patientId: string }) {
  const { data: profile } = useQuery({
    queryKey: ['growth-profile', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('date_of_birth, gender')
        .eq('id', patientId)
        .single();
      return data as { date_of_birth: string | null; gender: string | null } | null;
    },
    enabled: !!patientId,
  });

  const { data: vitals, isLoading } = useQuery({
    queryKey: ['growth-vitals', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('weight, recorded_at')
        .eq('user_id', patientId)
        .not('weight', 'is', null)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return (data || []) as { weight: number; recorded_at: string }[];
    },
    enabled: !!patientId,
  });

  const sex = (profile?.gender?.toLowerCase() === 'female' ? 'female' : 'male') as
    | 'male'
    | 'female';
  const dob = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;

  const { curves, points, latest } = useMemo(() => {
    if (!dob || !vitals) return { curves: [], points: [], latest: null };
    const pts = vitals
      .map((v) => {
        const at = new Date(v.recorded_at);
        const age = ageMonthsAt(dob, at);
        return { age: Math.round(age * 10) / 10, weight: v.weight, at };
      })
      .filter((p) => p.age >= 0 && p.age <= 60 && p.weight > 0);
    const curveData = referenceCurves('weight', sex, 60);
    // Merge the child's points onto the curve rows by nearest age
    let last = null;
    for (const row of curveData) {
      for (const p of pts) {
        if (Math.abs(p.age - row.age) < 0.5) {
          (row as any).child = p.weight;
          if (!last || p.at > last.at) {
            const z = zScore('weight', sex, p.age, p.weight);
            if (z != null) last = { z, age: p.age, weight: p.weight, at: p.at };
          }
        }
      }
    }
    // Latest z overall (even if beyond monthly curve merge)
    if (!last && pts.length > 0) {
      const p = pts[pts.length - 1];
      const z = zScore('weight', sex, p.age, p.weight);
      if (z != null) last = { z, age: p.age, weight: p.weight, at: p.at };
    }
    return { curves: curveData, points: pts, latest: last };
  }, [dob, vitals, sex]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading growth data...</div>;
  }

  // Pediatric tool (0-5 years per WHO 2006 standards) — hide for older patients
  if (dob && ageMonthsAt(dob, new Date()) > 61) {
    return null;
  }

  const status = latest ? classifyZ(latest.z) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Growth Chart — Weight for Age (WHO 2006)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!dob ? (
          <p className="text-sm text-muted-foreground">
            Date of birth is required to plot growth. Add it to the patient profile.
          </p>
        ) : !points || points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No weight measurements recorded yet. Record weights in vitals to track growth.
          </p>
        ) : (
          <>
            {latest && status && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status === 'normal' ? 'default' : 'destructive'}>
                  {status !== 'normal' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  WAZ {latest.z.toFixed(2)} — {STATUS_LABEL[status]}
                </Badge>
                <Badge variant="secondary">
                  {zToPercentile(latest.z)} percentile
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Latest: {latest.weight} kg at {latest.age} months ({sex === 'female' ? 'girls' : 'boys'} standard)
                </span>
              </div>
            )}
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curves} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[0, 60]}
                    label={{ value: 'Age (months)', position: 'insideBottom', offset: -2 }}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      `${value} kg`,
                      name === 'child'
                        ? 'Child'
                        : name === 'p50'
                          ? 'Median'
                          : name === 'p3'
                            ? '-2 SD'
                            : name === 'p97'
                              ? '+2 SD'
                              : name,
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="p97" stroke="#94a3b8" strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="+2 SD" />
                  <Line type="monotone" dataKey="p50" stroke="#22c55e" dot={false} strokeWidth={2} name="Median" />
                  <Line type="monotone" dataKey="p3" stroke="#ef4444" strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="-2 SD" />
                  <Line
                    type="monotone"
                    dataKey="child"
                    stroke="#2563eb"
                    strokeWidth={0}
                    dot={{ r: 4, fill: '#2563eb' }}
                    name="Child"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              Reference: WHO Child Growth Standards 2006 (weight-for-age, {sex === 'female' ? 'girls' : 'boys'}).
              A weight-for-age z-score below −2 needs clinical review; below −3 is severe.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
