import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const triageColors: Record<string, { bg: string; label: string }> = {
  critical: { bg: 'bg-red-500', label: 'Immediate' },
  red: { bg: 'bg-red-500', label: 'Immediate' },
  urgent: { bg: 'bg-orange-500', label: 'Emergency' },
  orange: { bg: 'bg-orange-500', label: 'Emergency' },
  standard: { bg: 'bg-yellow-500', label: 'Urgent' },
  yellow: { bg: 'bg-yellow-500', label: 'Urgent' },
  non_urgent: { bg: 'bg-emerald-500', label: 'Non-urgent' },
  green: { bg: 'bg-emerald-500', label: 'Non-urgent' },
};

export const EmergencyTriage = ({ hospital }: { hospital: any }) => {
  const { data: cases, loading, error, refresh } = useHospitalModule<any>(
    'emergency_cases', 'hospital_id', hospital?.id, { orderBy: 'arrival_time', ascending: false }
  );
  const { nameFor } = usePatientNames(cases.map(c => c.patient_id));

  const setStatus = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from('emergency_cases' as any) as any)
        .update({ status }).eq('id', row.id);
      if (err) throw err;
      toast.success(`Case ${row.case_number || ''} → ${status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update case');
    }
  };

  const vitalsOf = (c: any) => (typeof c.vitals === 'object' && c.vitals) || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Accident & Emergency (A&E)</h3>
          <p className="text-sm text-muted-foreground">Triage, resuscitation & emergency case management</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {['critical', 'urgent', 'standard', 'non_urgent'].map(key => (
          <Card key={key}>
            <CardContent className="pt-3 pb-3 flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${triageColors[key].bg} flex-shrink-0`} />
              <div>
                <p className="text-sm font-bold text-foreground">{cases.filter(c => c.triage_level === key).length}</p>
                <p className="text-[10px] text-muted-foreground">{triageColors[key].label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={AlertTriangle} title="Could not load emergency cases" description={error} actionLabel="Retry" onAction={refresh} />
      ) : cases.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No active emergency cases" description="Cases registered at A&E reception or arriving by ambulance appear here." />
      ) : (
        <div className="space-y-3">
          {cases.map(c => {
            const v = vitalsOf(c);
            const tone = triageColors[c.triage_level]?.bg;
            return (
              <Card key={c.id} className={c.triage_level === 'critical' ? 'border-red-500/50 bg-red-500/5' : ''}>
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`w-3 h-3 rounded-full ${tone || 'bg-muted'} flex-shrink-0`} />
                      <span className="font-medium text-sm text-foreground">{nameFor(c.patient_id)}</span>
                      <Badge variant={c.status === 'resuscitation' ? 'destructive' : c.status === 'waiting' ? 'outline' : 'secondary'} className="text-[10px] capitalize">
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mt-1 font-medium">{c.chief_complaint || 'Complaint not recorded'}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.case_number} • Arrived {c.arrival_time ? new Date(c.arrival_time).toLocaleString() : '—'}
                      {c.arrival_mode ? ` (${c.arrival_mode})` : ''}
                    </p>
                    {Object.keys(v).length > 0 && (
                      <div className="flex gap-3 mt-2 text-xs flex-wrap">
                        {Object.entries(v).map(([k, val]) => (
                          <span key={k} className="text-muted-foreground">
                            {k}: <strong className="text-foreground">{String(val)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {c.status !== 'resuscitation' && (
                      <Button size="sm" variant="destructive" className="text-xs" onClick={() => setStatus(c, 'resuscitation')}>Resus</Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setStatus(c, 'treatment')}>Treating</Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setStatus(c, 'admitted')}>Admit</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
