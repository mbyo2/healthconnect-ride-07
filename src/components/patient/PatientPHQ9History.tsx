import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Loader2, HeartHandshake } from 'lucide-react';
import { format } from 'date-fns';

interface PHQ9Row {
  id: string;
  total_score: number;
  severity: string;
  self_harm_risk: boolean;
  assessed_at: string;
}

const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Minimal: 'secondary',
  Mild: 'outline',
  Moderate: 'default',
  'Moderately Severe': 'destructive',
  Severe: 'destructive',
};

/** Patient-facing history of PHQ-9 screenings recorded by their clinicians (read-only, RLS: patient_id = auth.uid()). */
export default function PatientPHQ9History() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['patient-phq9', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('phq9_assessments')
        .select('id,total_score,severity,self_harm_risk,assessed_at')
        .eq('patient_id', user!.id)
        .order('assessed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PHQ9Row[];
    },
  });

  const latestRisk = data?.[0]?.self_harm_risk;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="h-4 w-4 text-primary" /> Mood screening history (PHQ-9)
        </CardTitle>
        <CardDescription>Scores from depression screenings done with your clinician. Lower is better (0–27).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="text-xs text-destructive">Could not load your screening history. Please try again later.</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No mood screenings yet. If your clinician does one with you, the result will appear here.
          </p>
        ) : (
          <>
            {latestRisk && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-foreground">
                <HeartHandshake className="h-4 w-4 shrink-0 text-destructive" />
                <span>
                  You are not alone. If you are thinking of harming yourself, please contact your clinician now,
                  or call the free Lifeline/Childline on <strong>116</strong> or <strong>933</strong>.
                </span>
              </div>
            )}
            <ul className="space-y-2">
              {data.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{format(new Date(r.assessed_at), 'd MMM yyyy')}</p>
                    <p className="text-lg font-bold font-mono text-foreground">{r.total_score}<span className="text-xs text-muted-foreground"> / 27</span></p>
                  </div>
                  <Badge variant={severityVariant[r.severity] ?? 'secondary'}>{r.severity}</Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
