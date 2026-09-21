import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, UserPlus, BedDouble } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdmitPatientDialog } from './AdmitPatientDialog';

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

  // Lives depend on new arrivals appearing instantly — subscribe, don't poll.
  useEffect(() => {
    if (!hospital?.id) return;
    const channel = supabase
      .channel(`emergency-cases-${hospital.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_cases', filter: `hospital_id=eq.${hospital.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, refresh]);

  // New-case intake state
  const [showNewCase, setShowNewCase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientName: '', phone: '', triage: 'urgent', complaint: '',
    arrivalMode: 'walk-in', bp: '', pulse: '', spo2: '', temp: '',
  });

  // A&E → IPD handoff state (shared admit dialog)
  const [admitCase, setAdmitCase] = useState<any>(null);
  const [showAdmit, setShowAdmit] = useState(false);

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

  const registerCase = async () => {
    if (!form.patientName.trim() || !form.complaint.trim()) {
      toast.error('Patient name and chief complaint are required');
      return;
    }
    if (!hospital?.id) {
      toast.error('No hospital context available');
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const vitals: Record<string, string> = {};
      if (form.bp) vitals.bp = form.bp;
      if (form.pulse) vitals.pulse = form.pulse;
      if (form.spo2) vitals.spo2 = form.spo2;
      if (form.temp) vitals.temp = form.temp;
      // Link a registered record when the phone matches a patient profile.
      let patientId: string | null = null;
      if (form.phone.trim()) {
        const { data: match } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'patient')
          .eq('phone', form.phone.trim())
          .maybeSingle();
        patientId = (match as any)?.id || null;
      }
      const caseNumber = `A&E-${Date.now().toString(36).toUpperCase()}`;
      const { error: err } = await (supabase.from('emergency_cases' as any) as any).insert({
        hospital_id: hospital.id,
        case_number: caseNumber,
        patient_id: patientId,
        chief_complaint: form.complaint.trim(),
        triage_level: form.triage,
        arrival_mode: form.arrivalMode,
        arrival_time: new Date().toISOString(),
        status: 'waiting',
        vitals,
        notes: JSON.stringify({ walk_in_name: form.patientName.trim(), phone: form.phone.trim() || undefined }),
      });
      if (err) throw err;
      toast.success(`A&E case ${caseNumber} registered${patientId ? ' (linked to patient record)' : ''}`);
      setShowNewCase(false);
      setForm({ patientName: '', phone: '', triage: 'urgent', complaint: '', arrivalMode: 'walk-in', bp: '', pulse: '', spo2: '', temp: '' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to register case');
    } finally {
      setSaving(false);
    }
  };

  const openAdmit = (c: any) => {
    setAdmitCase(c);
    setShowAdmit(true);
  };

  const handleAdmitted = async () => {
    if (!admitCase) return;
    await setStatus(admitCase, 'admitted');
    setAdmitCase(null);
  };

  const vitalsOf = (c: any) => (typeof c.vitals === 'object' && c.vitals) || {};

  const displayName = (c: any) => {
    const linked = nameFor(c.patient_id);
    if (linked) return linked;
    try {
      const meta = JSON.parse(c.notes || '{}');
      if (meta.walk_in_name) return `${meta.walk_in_name} (walk-in)`;
    } catch { /* plain-text note */ }
    return 'Unidentified patient';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Accident & Emergency (A&E)</h3>
          <p className="text-sm text-muted-foreground">Triage, resuscitation & emergency case management</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={() => setShowNewCase(true)} className="gap-1">
            <UserPlus className="h-4 w-4" /> New Case
          </Button>
        </div>
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
                      <span className="font-medium text-sm text-foreground">{displayName(c)}</span>
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
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => openAdmit(c)}>
                      <BedDouble className="h-3 w-3 mr-1" /> Admit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setStatus(c, 'resolved')}>Resolve</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Shared admit dialog (A&E → IPD handoff) */}
      <AdmitPatientDialog
        hospital={hospital}
        open={showAdmit}
        onOpenChange={setShowAdmit}
        defaultPatientId={admitCase?.patient_id}
        defaultPatientName={admitCase ? displayName(admitCase) : undefined}
        defaultDiagnosis={admitCase?.chief_complaint}
        defaultAdmissionType="emergency"
        sourceLabel={admitCase?.case_number}
        onAdmitted={handleAdmitted}
      />

      {/* New A&E case registration */}
      <Dialog open={showNewCase} onOpenChange={setShowNewCase}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register A&E Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Phone (links record)</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Matches patient profile" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Triage Level *</Label>
                <Select value={form.triage} onValueChange={v => setForm({ ...form, triage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical — Immediate</SelectItem>
                    <SelectItem value="urgent">Urgent — Emergency</SelectItem>
                    <SelectItem value="standard">Standard — Urgent</SelectItem>
                    <SelectItem value="non_urgent">Non-urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arrival Mode</Label>
                <Select value={form.arrivalMode} onValueChange={v => setForm({ ...form, arrivalMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="ambulance">Ambulance</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Chief Complaint *</Label>
              <Textarea value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} placeholder="e.g. Road traffic accident, chest pain…" rows={2} />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Triage Vitals</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">BP</Label><Input value={form.bp} onChange={e => setForm({ ...form, bp: e.target.value })} placeholder="120/80" className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Pulse</Label><Input value={form.pulse} onChange={e => setForm({ ...form, pulse: e.target.value })} placeholder="72" className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">SpO2 %</Label><Input value={form.spo2} onChange={e => setForm({ ...form, spo2: e.target.value })} placeholder="98" className="text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Temp °C</Label><Input value={form.temp} onChange={e => setForm({ ...form, temp: e.target.value })} placeholder="37.0" className="text-sm" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCase(false)}>Cancel</Button>
            <Button onClick={registerCase} disabled={saving}>
              <AlertTriangle className="h-4 w-4 mr-2" /> {saving ? 'Registering…' : 'Register Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
