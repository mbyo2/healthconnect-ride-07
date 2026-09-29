import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LabResultRow {
  id: string;
  test_name: string | null;
  result_value: string | null;
  unit: string | null;
  reference_range: string | null;
  notes: string | null;
  verified_at: string | null;
  created_at: string;
}

export default function PatientLabResults() {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient-lab-results', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Live lab_results carries test_name + notes directly; verified_at
      // exists after the 20260930 drift catch-up. Order by created_at.
      const { data, error } = await supabase
        .from('lab_results')
        .select('id, test_name, result_value, unit, reference_range, notes, verified_at, created_at')
        .eq('patient_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error('lab_results fetch error', error);
        return [] as LabResultRow[];
      }
      return (data || []) as unknown as LabResultRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Lab Results
        </CardTitle>
        <CardDescription>Your recent laboratory test results</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : isError ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-destructive">We couldn&apos;t load your lab results.</p>
            <Button variant="outline" className="h-11 min-h-[44px]" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No lab results yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map(r => {
              const critical = (r.notes || '').toLowerCase().includes('critical');
              const testName = r.test_name || 'Lab test';
              const resultDate = r.verified_at || r.created_at;
              return (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{testName}</h4>
                      {critical && <Badge variant="destructive">Critical</Badge>}
                    </div>
                    <p className="text-sm">{r.result_value ? `${r.result_value} ${r.unit || ''}`.trim() : 'Result pending'}</p>
                    {r.reference_range && (
                      <p className="text-xs text-muted-foreground">Ref: {r.reference_range}</p>
                    )}
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {resultDate ? format(new Date(resultDate), 'PPP') : 'Date not recorded'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
