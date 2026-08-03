import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, Clock, CheckCircle2, Stethoscope } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Scheduled', variant: 'outline' },
  pre_op: { label: 'Pre-Op Prep', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'secondary' },
  post_op: { label: 'Post-Op Recovery', variant: 'secondary' },
  completed: { label: 'Discharged', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export const DayCareManagement = ({ hospital }: { hospital: any }) => {
  const { data: procedures, loading, error, refresh } = useHospitalModule<any>(
    'day_care_procedures', 'hospital_id', hospital?.id, { orderBy: 'scheduled_date', ascending: false }
  );
  const { nameFor } = usePatientNames(procedures.map(p => p.patient_id));

  const stats = {
    total: procedures.length,
    active: procedures.filter(p => ['in_progress', 'pre_op', 'post_op'].includes(p.status)).length,
    completed: procedures.filter(p => p.status === 'completed').length,
    upcoming: procedures.filter(p => p.status === 'scheduled').length,
  };

  const advance = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from('day_care_procedures' as any) as any)
        .update({ status }).eq('id', row.id);
      if (err) throw err;
      toast.success(`${row.procedure_name} → ${statusConfig[status]?.label || status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update procedure');
    }
  };

  const nextStatus = (s: string) =>
    s === 'scheduled' ? 'pre_op' : s === 'pre_op' ? 'in_progress' : s === 'in_progress' ? 'post_op' : s === 'post_op' ? 'completed' : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Day Care / Short Stay</h3>
          <p className="text-sm text-muted-foreground">Same-day procedures and recovery tracking</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Sun className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Procedures</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Stethoscope className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.upcoming}</p>
          <p className="text-xs text-muted-foreground">Upcoming</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Discharged</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Sun} title="Could not load day care list" description={error} actionLabel="Retry" onAction={refresh} />
      ) : procedures.length === 0 ? (
        <EmptyState icon={Sun} title="No day care procedures scheduled" description="Booked short-stay procedures will appear here." />
      ) : (
        <div className="space-y-3">
          {procedures.map(p => {
            const next = nextStatus(p.status);
            return (
              <Card key={p.id}>
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{nameFor(p.patient_id)}</span>
                      <Badge variant={statusConfig[p.status]?.variant || 'outline'} className="text-[10px]">
                        {statusConfig[p.status]?.label || p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.procedure_name}
                      {p.scheduled_date ? ` • ${p.scheduled_date}` : ''}{p.scheduled_time ? ` ${p.scheduled_time}` : ''}
                      {p.estimated_duration ? ` • ${p.estimated_duration}` : ''}
                      {p.bed_number ? ` • Bed ${p.bed_number}` : ''}
                    </p>
                  </div>
                  {next && (
                    <Button size="sm" className="text-xs" onClick={() => advance(p, next)}>
                      Move to {statusConfig[next]?.label}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
