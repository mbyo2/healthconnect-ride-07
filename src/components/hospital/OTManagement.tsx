import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Scissors, Clock, Calendar, AlertTriangle, Timer, FileSignature } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHospitalModule } from '@/hooks/useHospitalModule';

interface OTProps {
  hospital?: any;
}

interface Surgery {
  id: string;
  patient_name: string;
  patient_id: string | null;
  procedure_name: string;
  surgeon_name: string;
  ot_room: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  anaesthesia_type: string;
  consent_signed: boolean;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

const meta = (notes: string | null) => {
  if (!notes) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : { preOpNotes: notes };
  } catch {
    return { preOpNotes: notes };
  }
};

export const OTManagement = ({ hospital }: OTProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showAnaesthesia, setShowAnaesthesia] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [selected, setSelected] = useState<Surgery | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: schedules, loading, refresh } = useHospitalModule<Surgery>(
    'ot_surgeries',
    'institution_id',
    hospital?.id,
    { orderBy: 'scheduled_date', ascending: false }
  );

  const [form, setForm] = useState({
    patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1',
    date: '', time: '', duration: '60', anesthetist: '', preOpNotes: '',
    isMinor: false, guardianName: ''
  });

  const [anaesthesiaForm, setAnaesthesiaForm] = useState({
    anaesthesiaType: 'general', drugsAdministered: '', intraopMonitoring: '',
    recoveryVitals: '', postAnaesthesiaStatus: 'Stable'
  });

  const recentSurgeryFor = (name: string) =>
    schedules.some(s =>
      s.patient_name?.toLowerCase() === name.toLowerCase() &&
      s.status === 'completed' &&
      new Date(s.scheduled_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

  const addSchedule = async () => {
    if (!form.patientName || !form.surgeryType || !form.date || !form.time) {
      toast.error('Please fill required fields');
      return;
    }
    if (!hospital?.id) {
      toast.error('No hospital context available');
      return;
    }
    if (form.isMinor && !form.guardianName) {
      toast.error('Guardian name is mandatory for minor patients');
      return;
    }
    const recent = recentSurgeryFor(form.patientName);
    if (recent) {
      toast.warning('⚠️ This patient had a surgery within the last 30 days. Please verify there is no medical contraindication.', { duration: 8000 });
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase.from('ot_surgeries' as any) as any).insert({
        institution_id: hospital.id,
        patient_name: form.patientName,
        procedure_name: form.surgeryType,
        surgeon_name: form.surgeon || 'TBD',
        ot_room: form.otRoom,
        scheduled_date: form.date,
        scheduled_time: form.time,
        status: 'scheduled',
        anaesthesia_type: 'general',
        consent_signed: false,
        created_by: userData?.user?.id,
        notes: JSON.stringify({
          duration: form.duration,
          anesthetist: form.anesthetist || undefined,
          preOpNotes: form.preOpNotes || undefined,
          isMinor: form.isMinor,
          guardianName: form.guardianName || undefined,
          recentSurgeryAlert: recent,
        }),
      });
      if (error) throw error;
      setForm({ patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1', date: '', time: '', duration: '60', anesthetist: '', preOpNotes: '', isMinor: false, guardianName: '' });
      setShowDialog(false);
      toast.success('Surgery scheduled successfully');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to schedule surgery');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (s: Surgery, status: string) => {
    try {
      const now = new Date().toISOString();
      const patch: Record<string, any> = { status };
      if (status === 'in-progress') patch.started_at = now;
      if (status === 'completed') patch.completed_at = now;
      const { error } = await (supabase.from('ot_surgeries' as any) as any).update(patch).eq('id', s.id);
      if (error) throw error;
      toast.success('Surgery status updated');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update surgery');
    }
  };

  const saveAnaesthesia = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const existing = meta(selected.notes);
      const { error } = await (supabase.from('ot_surgeries' as any) as any).update({
        anaesthesia_type: anaesthesiaForm.anaesthesiaType,
        notes: JSON.stringify({ ...existing, anaesthesia: anaesthesiaForm }),
      }).eq('id', selected.id);
      if (error) throw error;

      if (selected.patient_id && hospital?.id) {
        await (supabase.from('ot_anaesthesia_records' as any) as any).insert({
          hospital_id: hospital.id,
          patient_id: selected.patient_id,
          ot_booking_id: selected.id,
          anaesthesia_type: anaesthesiaForm.anaesthesiaType,
          anaesthetist_name: existing.anesthetist || null,
          drugs_administered: anaesthesiaForm.drugsAdministered
            ? anaesthesiaForm.drugsAdministered.split(',').map((d: string) => ({ drug: d.trim() }))
            : [],
          intraop_monitoring: anaesthesiaForm.intraopMonitoring ? { notes: anaesthesiaForm.intraopMonitoring } : {},
          recovery_vitals: anaesthesiaForm.recoveryVitals ? { notes: anaesthesiaForm.recoveryVitals } : {},
          post_anaesthesia_status: anaesthesiaForm.postAnaesthesiaStatus,
          consent_signed: selected.consent_signed,
          is_minor: !!existing.isMinor,
          guardian_name: existing.guardianName || null,
          surgery_start_time: selected.started_at,
          surgery_end_time: selected.completed_at,
        });
      }

      setShowAnaesthesia(false);
      toast.success('Anaesthesia record saved');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save anaesthesia record');
    } finally {
      setSaving(false);
    }
  };

  const signConsent = async () => {
    if (!selected) return;
    const info = meta(selected.notes);
    if (info.isMinor && !info.guardianName) {
      toast.error('Guardian name is mandatory for minor patients');
      return;
    }
    try {
      const { error } = await (supabase.from('ot_surgeries' as any) as any)
        .update({ consent_signed: true }).eq('id', selected.id);
      if (error) throw error;
      setShowConsent(false);
      toast.success('Consent form signed');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record consent');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'secondary';
      case 'in-progress': return 'default';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const todaySchedules = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return schedules.filter(s => s.scheduled_date === today);
  }, [schedules]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div><p className="text-2xl font-bold">{todaySchedules.length}</p><p className="text-xs text-muted-foreground">Today</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-primary" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'in-progress').length}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'scheduled').length}</p><p className="text-xs text-muted-foreground">Upcoming</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-primary" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.consent_signed).length}</p><p className="text-xs text-muted-foreground">Consent Signed</p></div>
        </div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Operation Theatre Schedule</CardTitle>
            <Button onClick={() => setShowDialog(true)}><Plus className="h-4 w-4 mr-2" /> Schedule Surgery</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading theatre schedule…</div>
          ) : schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map(schedule => {
                const info = meta(schedule.notes);
                return (
                  <div key={schedule.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{schedule.patient_name}</h4>
                          <Badge variant={getStatusColor(schedule.status) as any}>{schedule.status}</Badge>
                          <Badge variant="outline" className="text-[10px]">{schedule.ot_room}</Badge>
                          {info.isMinor && <Badge variant="secondary" className="text-[10px]">Minor</Badge>}
                          {!schedule.consent_signed && <Badge variant="destructive" className="text-[10px]">No Consent</Badge>}
                          {info.recentSurgeryAlert && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> Recent Surgery
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1">{schedule.procedure_name}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span>Surgeon: {schedule.surgeon_name || 'TBD'}</span>
                          <span>Date: {schedule.scheduled_date} at {schedule.scheduled_time}</span>
                          {info.duration && <span>Duration: {info.duration} min</span>}
                          {info.anesthetist && <span>Anesthetist: {info.anesthetist}</span>}
                        </div>
                        {(schedule.started_at || schedule.completed_at) && (
                          <div className="flex gap-3 mt-2 flex-wrap">
                            {schedule.started_at && <Badge variant="outline" className="text-[8px]"><Timer className="h-2 w-2 mr-1" /> Start: {new Date(schedule.started_at).toLocaleTimeString()}</Badge>}
                            {schedule.completed_at && <Badge variant="outline" className="text-[8px]">End: {new Date(schedule.completed_at).toLocaleTimeString()}</Badge>}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {!schedule.consent_signed && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelected(schedule); setShowConsent(true); }}>
                            <FileSignature className="h-3 w-3 mr-1" /> Consent
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                          setSelected(schedule);
                          const a = info.anaesthesia || {};
                          setAnaesthesiaForm({
                            anaesthesiaType: schedule.anaesthesia_type || 'general',
                            drugsAdministered: a.drugsAdministered || '',
                            intraopMonitoring: a.intraopMonitoring || '',
                            recoveryVitals: a.recoveryVitals || '',
                            postAnaesthesiaStatus: a.postAnaesthesiaStatus || 'Stable',
                          });
                          setShowAnaesthesia(true);
                        }}>Anaesthesia</Button>
                        {schedule.status === 'scheduled' && schedule.consent_signed && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(schedule, 'in-progress')}>Start</Button>
                        )}
                        {schedule.status === 'in-progress' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(schedule, 'completed')}>Complete</Button>
                        )}
                        {schedule.status === 'scheduled' && (
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(schedule, 'cancelled')}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No surgeries scheduled</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Surgery</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patient Name *</Label><Input value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Surgery Type *</Label><Input value={form.surgeryType} onChange={e => setForm(p => ({ ...p, surgeryType: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Surgeon</Label><Input value={form.surgeon} onChange={e => setForm(p => ({ ...p, surgeon: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>OT Room</Label>
                <Select value={form.otRoom} onValueChange={v => setForm(p => ({ ...p, otRoom: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OT-1">OT-1</SelectItem>
                    <SelectItem value="OT-2">OT-2</SelectItem>
                    <SelectItem value="OT-3">OT-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Time *</Label><Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Anesthetist</Label><Input value={form.anesthetist} onChange={e => setForm(p => ({ ...p, anesthetist: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Checkbox id="isMinor" checked={form.isMinor} onCheckedChange={v => setForm(p => ({ ...p, isMinor: !!v }))} />
              <Label htmlFor="isMinor" className="text-sm">Patient is a minor</Label>
            </div>
            {form.isMinor && (
              <div className="space-y-2"><Label>Guardian Name *</Label><Input value={form.guardianName} onChange={e => setForm(p => ({ ...p, guardianName: e.target.value }))} /></div>
            )}
            <div className="space-y-2"><Label>Pre-Op Notes</Label><Textarea value={form.preOpNotes} onChange={e => setForm(p => ({ ...p, preOpNotes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addSchedule} disabled={saving}>{saving ? 'Scheduling…' : 'Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anaesthesia Dialog */}
      <Dialog open={showAnaesthesia} onOpenChange={setShowAnaesthesia}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Anaesthesia Record — {selected?.patient_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Anaesthesia Type</Label>
              <Select value={anaesthesiaForm.anaesthesiaType} onValueChange={v => setAnaesthesiaForm(p => ({ ...p, anaesthesiaType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="sedation">Sedation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Drugs Administered (comma separated)</Label><Textarea rows={2} value={anaesthesiaForm.drugsAdministered} onChange={e => setAnaesthesiaForm(p => ({ ...p, drugsAdministered: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Intra-op Monitoring</Label><Textarea rows={2} value={anaesthesiaForm.intraopMonitoring} onChange={e => setAnaesthesiaForm(p => ({ ...p, intraopMonitoring: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Recovery Vitals</Label><Textarea rows={2} value={anaesthesiaForm.recoveryVitals} onChange={e => setAnaesthesiaForm(p => ({ ...p, recoveryVitals: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Post-Anaesthesia Status</Label>
              <Select value={anaesthesiaForm.postAnaesthesiaStatus} onValueChange={v => setAnaesthesiaForm(p => ({ ...p, postAnaesthesiaStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Observation">Under Observation</SelectItem>
                  <SelectItem value="Complications">Complications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnaesthesia(false)}>Cancel</Button>
            <Button onClick={saveAnaesthesia} disabled={saving}>{saving ? 'Saving…' : 'Save Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent Dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Surgical Consent</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Confirm that informed consent for <strong>{selected?.procedure_name}</strong> has been explained to and signed by
              {meta(selected?.notes || null).isMinor ? ' the legal guardian' : ' the patient'}.
            </p>
            {meta(selected?.notes || null).guardianName && (
              <p className="text-sm">Guardian: <strong>{meta(selected?.notes || null).guardianName}</strong></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsent(false)}>Cancel</Button>
            <Button onClick={signConsent}><FileSignature className="h-4 w-4 mr-2" /> Confirm Consent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
