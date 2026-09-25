import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LabResultRow {
  id: string;
  result_value: string | null;
  unit: string | null;
  reference_range: string | null;
  comments: string | null;
  verified_at: string | null;
  created_at: string;
  lab_tests: { name: string | null } | null;
}

export default function PatientLabResults() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['patient-lab-results', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // lab_results has no test_date column — order by created_at; the test
      // name comes from the lab_tests FK (test_id).
      const { data, error } = await supabase
        .from('lab_results')
        .select('id, result_value, unit, reference_range, comments, verified_at, created_at, lab_tests(name)')
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
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No lab results yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map(r => {
              const critical = (r.comments || '').toLowerCase().includes('critical');
              const testName = r.lab_tests?.name || 'Lab test';
              const resultDate = r.verified_at || r.created_at;
              return (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{testName}</h4>
                      {critical && <Badge variant="destructive">Critical</Badge>}
                    </div>
                    <p className="text-sm">{r.result_value} {r.unit}</p>
                    {r.reference_range && (
                      <p className="text-xs text-muted-foreground">Ref: {r.reference_range}</p>
                    )}
                    {r.comments && <p className="text-xs text-muted-foreground mt-1">{r.comments}</p>}
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
