import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Loader2, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface LabResultRow {
  id: string;
  test_name: string;
  test_date: string;
  result_value: string | null;
  unit: string | null;
  reference_range: string | null;
  notes: string | null;
  document_url: string | null;
  created_at: string;
}

export default function PatientLabResults() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['patient-lab-results', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('patient_id', user!.id)
        .order('test_date', { ascending: false })
        .limit(50);
      if (error) {
        console.error('lab_results fetch error', error);
        return [] as LabResultRow[];
      }
      return (data || []) as LabResultRow[];
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
              const critical = (r.notes || '').toLowerCase().includes('critical');
              return (
                <div key={r.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{r.test_name}</h4>
                      {critical && <Badge variant="destructive">Critical</Badge>}
                    </div>
                    <p className="text-sm">{r.result_value} {r.unit}</p>
                    {r.reference_range && (
                      <p className="text-xs text-muted-foreground">Ref: {r.reference_range}</p>
                    )}
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(r.test_date), 'PPP')}
                    </p>
                  </div>
                  {r.document_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={r.document_url} target="_blank" rel="noreferrer">
                        <FileDown className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
