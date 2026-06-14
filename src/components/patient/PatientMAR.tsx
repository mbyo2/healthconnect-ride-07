import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, Loader2, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface MARRow {
  id: string;
  medication_name: string;
  dosage: string;
  route: string;
  scheduled_time: string;
  administered_time: string | null;
  status: string;
  hold_reason: string | null;
  refusal_reason: string | null;
  notes: string | null;
}

const statusIcon: Record<string, any> = {
  scheduled: Clock,
  administered: CheckCircle2,
  held: AlertTriangle,
  refused: XCircle,
  missed: XCircle,
  not_given: XCircle,
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'secondary',
  administered: 'default',
  held: 'outline',
  refused: 'destructive',
  missed: 'destructive',
  not_given: 'outline',
};

export default function PatientMAR() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['patient-mar', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('medication_administration_records' as any) as any)
        .select('*')
        .eq('patient_id', user!.id)
        .order('scheduled_time', { ascending: false })
        .limit(50);
      if (error) { console.error('MAR fetch error', error); return [] as MARRow[]; }
      return (data || []) as MARRow[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          Medication Administration
        </CardTitle>
        <CardDescription>Medications given (or scheduled) during your hospital stay</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No medication records yet.</p>
        ) : (
          <div className="space-y-3">
            {data.map(r => {
              const Icon = statusIcon[r.status] || Clock;
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium truncate">{r.medication_name}</h4>
                      <Badge variant={statusVariant[r.status] || 'secondary'} className="capitalize">{r.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.dosage} • {r.route}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled {format(new Date(r.scheduled_time), 'PPP p')}
                      {r.administered_time && ` • Given ${format(new Date(r.administered_time), 'p')}`}
                    </p>
                    {r.hold_reason && <p className="text-xs text-muted-foreground mt-1">Hold reason: {r.hold_reason}</p>}
                    {r.refusal_reason && <p className="text-xs text-muted-foreground mt-1">Refusal: {r.refusal_reason}</p>}
                    {r.notes && <p className="text-xs text-muted-foreground mt-1">{r.notes}</p>}
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
