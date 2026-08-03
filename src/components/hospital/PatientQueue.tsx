import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, CheckCircle2, ArrowRight, Monitor } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  hospital: any;
  departments: any[];
}

export const PatientQueue = ({ hospital, departments }: Props) => {
  const [selectedDept, setSelectedDept] = useState('all');
  const { data: queues, loading, error, refresh } = useHospitalModule<any>(
    'queue_tokens',
    'institution_id',
    hospital?.id,
    { orderBy: 'check_in_time', ascending: true }
  );

  const active = queues.filter(q => ['waiting', 'serving'].includes(q.status));
  const filtered = selectedDept === 'all' ? active : active.filter(q => q.department === selectedDept);
  const deptList = Array.from(new Set([
    ...active.map(q => q.department).filter(Boolean),
    ...(departments || []).map((d: any) => d.name),
  ]));

  const waitMinutes = (row: any) => {
    if (!row.check_in_time) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(row.check_in_time).getTime()) / 60000));
  };

  const setStatus = async (row: any, status: string) => {
    try {
      const patch: any = { status };
      if (status === 'serving') patch.serving_start_time = new Date().toISOString();
      if (status === 'completed') patch.completed_time = new Date().toISOString();
      const { error: err } = await (supabase.from('queue_tokens' as any) as any).update(patch).eq('id', row.id);
      if (err) throw err;
      toast.success(`${row.token_number} marked ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update queue token');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Patient Queue & Token Display</h3>
          <p className="text-sm text-muted-foreground">Live OPD queue across counters</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {deptList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={refresh} className="gap-2">
            <Monitor className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{active.length}</p>
          <p className="text-xs text-muted-foreground">In Queue</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{active.filter(q => q.status === 'waiting').length}</p>
          <p className="text-xs text-muted-foreground">Waiting</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{queues.filter(q => q.status === 'completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Users} title="Could not load the queue" description={error} actionLabel="Retry" onAction={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients in the queue"
          description="Tokens issued at reception appear here in real time."
          actionLabel="Refresh"
          onAction={refresh}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <Card key={q.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary">{q.token_number}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.patient_name || 'Walk-in patient'}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.department || 'General'} • Priority: {q.priority} • Waiting {waitMinutes(q)} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={q.status === 'serving' ? 'default' : 'outline'} className="capitalize text-[10px]">{q.status}</Badge>
                  {q.status === 'waiting' && (
                    <Button size="sm" className="text-xs gap-1" onClick={() => setStatus(q, 'serving')}>
                      Call <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                  {q.status === 'serving' && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setStatus(q, 'completed')}>
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
