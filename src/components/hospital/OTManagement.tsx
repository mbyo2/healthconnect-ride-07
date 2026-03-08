import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Scissors, Clock, Calendar, AlertTriangle, Timer, FileSignature, User } from 'lucide-react';
import { toast } from 'sonner';

interface OTSchedule {
  id: string;
  patientName: string;
  surgeryType: string;
  surgeon: string;
  otRoom: string;
  date: string;
  time: string;
  duration: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  anesthetist?: string;
  preOpNotes?: string;
  // Enhanced fields
  anaesthesiaType?: string;
  drugsAdministered?: string;
  intraopMonitoring?: string;
  recoveryVitals?: string;
  postAnaesthesiaStatus?: string;
  checkinTime?: string;
  surgeryStartTime?: string;
  surgeryEndTime?: string;
  checkoutTime?: string;
  consentSigned?: boolean;
  isMinor?: boolean;
  guardianName?: string;
  recentSurgeryAlert?: boolean;
}

export const OTManagement = () => {
  const [schedules, setSchedules] = useState<OTSchedule[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showAnaesthesia, setShowAnaesthesia] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<OTSchedule | null>(null);

  const [form, setForm] = useState({
    patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1',
    date: '', time: '', duration: '60', anesthetist: '', preOpNotes: '',
    isMinor: false, guardianName: ''
  });

  const [anaesthesiaForm, setAnaesthesiaForm] = useState({
    anaesthesiaType: 'General', drugsAdministered: '', intraopMonitoring: '',
    recoveryVitals: '', postAnaesthesiaStatus: 'Stable'
  });

  const addSchedule = () => {
    if (!form.patientName || !form.surgeryType || !form.date || !form.time) {
      toast.error('Please fill required fields');
      return;
    }

    // Check for recent surgery in last 30 days
    const recentSurgery = schedules.some(s =>
      s.patientName === form.patientName &&
      s.status === 'completed' &&
      new Date(s.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentSurgery) {
      toast.warning('⚠️ This patient had a surgery within the last 30 days. Please verify there is no medical contraindication.', { duration: 8000 });
    }

    // Consent validation for minors
    if (form.isMinor && !form.guardianName) {
      toast.error('Guardian name is mandatory for minor patients');
      return;
    }

    const schedule: OTSchedule = {
      id: crypto.randomUUID(),
      patientName: form.patientName,
      surgeryType: form.surgeryType,
      surgeon: form.surgeon,
      otRoom: form.otRoom,
      date: form.date,
      time: form.time,
      duration: form.duration,
      status: 'scheduled',
      anesthetist: form.anesthetist,
      preOpNotes: form.preOpNotes,
      isMinor: form.isMinor,
      guardianName: form.guardianName,
      consentSigned: false,
      recentSurgeryAlert: recentSurgery,
    };
    setSchedules(prev => [...prev, schedule]);
    setForm({ patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1', date: '', time: '', duration: '60', anesthetist: '', preOpNotes: '', isMinor: false, guardianName: '' });
    setShowDialog(false);
    toast.success('Surgery scheduled successfully');
  };

  const updateStatus = (id: string, status: OTSchedule['status']) => {
    const now = new Date().toISOString();
    setSchedules(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updates: Partial<OTSchedule> = { status };
      if (status === 'in-progress') {
        updates.checkinTime = updates.checkinTime || now;
        updates.surgeryStartTime = now;
      }
      if (status === 'completed') {
        updates.surgeryEndTime = now;
        updates.checkoutTime = now;
      }
      return { ...s, ...updates };
    }));
    toast.success(`Surgery status updated`);
  };

  const saveAnaesthesia = () => {
    if (!selectedSchedule) return;
    setSchedules(prev => prev.map(s =>
      s.id === selectedSchedule.id ? { ...s, ...anaesthesiaForm } : s
    ));
    setShowAnaesthesia(false);
    toast.success('Anaesthesia record saved');
  };

  const signConsent = () => {
    if (!selectedSchedule) return;
    if (selectedSchedule.isMinor && !selectedSchedule.guardianName) {
      toast.error('Guardian name is mandatory for minor patients');
      return;
    }
    setSchedules(prev => prev.map(s =>
      s.id === selectedSchedule.id ? { ...s, consentSigned: true } : s
    ));
    setShowConsent(false);
    toast.success('Consent form signed');
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

  const todaySchedules = schedules.filter(s => s.date === new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <div><p className="text-2xl font-bold">{todaySchedules.length}</p><p className="text-xs text-muted-foreground">Today</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-amber-500" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'in-progress').length}</p><p className="text-xs text-muted-foreground">In Progress</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.status === 'scheduled').length}</p><p className="text-xs text-muted-foreground">Upcoming</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-emerald-500" />
          <div><p className="text-2xl font-bold">{schedules.filter(s => s.consentSigned).length}</p><p className="text-xs text-muted-foreground">Consent Signed</p></div>
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
          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{schedule.patientName}</h4>
                        <Badge variant={getStatusColor(schedule.status) as any}>{schedule.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{schedule.otRoom}</Badge>
                        {schedule.isMinor && <Badge variant="secondary" className="text-[10px]">Minor</Badge>}
                        {!schedule.consentSigned && <Badge variant="destructive" className="text-[10px]">No Consent</Badge>}
                        {schedule.recentSurgeryAlert && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertTriangle className="h-3 w-3" /> Recent Surgery
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1">{schedule.surgeryType}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span>Surgeon: {schedule.surgeon || 'TBD'}</span>
                        <span>Date: {schedule.date} at {schedule.time}</span>
                        <span>Duration: {schedule.duration} min</span>
                        {schedule.anesthetist && <span>Anesthetist: {schedule.anesthetist}</span>}
                      </div>
                      {/* OT Timestamps */}
                      {(schedule.checkinTime || schedule.surgeryStartTime || schedule.surgeryEndTime || schedule.checkoutTime) && (
                        <div className="flex gap-3 mt-2 flex-wrap">
                          {schedule.checkinTime && <Badge variant="outline" className="text-[8px]"><Timer className="h-2 w-2 mr-1" /> Check-in: {new Date(schedule.checkinTime).toLocaleTimeString()}</Badge>}
                          {schedule.surgeryStartTime && <Badge variant="outline" className="text-[8px]">Start: {new Date(schedule.surgeryStartTime).toLocaleTimeString()}</Badge>}
                          {schedule.surgeryEndTime && <Badge variant="outline" className="text-[8px]">End: {new Date(schedule.surgeryEndTime).toLocaleTimeString()}</Badge>}
                          {schedule.checkoutTime && <Badge variant="outline" className="text-[8px]">Checkout: {new Date(schedule.checkoutTime).toLocaleTimeString()}</Badge>}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {!schedule.consentSigned && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { setSelectedSchedule(schedule); setShowConsent(true); }}>
                          <FileSignature className="h-3 w-3 mr-1" /> Consent
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                        setSelectedSchedule(schedule);
                        setAnaesthesiaForm({ anaesthesiaType: schedule.anaesthesiaType || 'General', drugsAdministered: schedule.drugsAdministered || '', intraopMonitoring: schedule.intraopMonitoring || '', recoveryVitals: schedule.recoveryVitals || '', postAnaesthesiaStatus: schedule.postAnaesthesiaStatus || 'Stable' });
                        setShowAnaesthesia(true);
                      }}>Anaesthesia</Button>
                      {schedule.status === 'scheduled' && schedule.consentSigned && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(schedule.id, 'in-progress')}>Start</Button>
                      )}
                      {schedule.status === 'in-progress' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(schedule.id, 'completed')}>Complete</Button>
                      )}
                      {schedule.status === 'scheduled' && (
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(schedule.id, 'cancelled')}>Cancel</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              <div className="space-y-2"><Label>Surgery Type *</Label><Input value={form.surgeryType} onChange={e => setForm(p => ({ ...p, surgeryType: e.target.value }))} placeholder="e.g., Appendectomy" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Surgeon</Label><Input value={form.surgeon} onChange={e => setForm(p => ({ ...p, surgeon: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Anesthetist</Label><Input value={form.anesthetist} onChange={e => setForm(p => ({ ...p, anesthetist: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Time *</Label><Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>OT Room</Label>
              <Select value={form.otRoom} onValueChange={v => setForm(p => ({ ...p, otRoom: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['OT-1', 'OT-2', 'OT-3', 'OT-4', 'Minor OT'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox checked={form.isMinor} onCheckedChange={(v) => setForm(p => ({ ...p, isMinor: Boolean(v) }))} />
              <div>
                <Label className="text-sm font-medium">Patient is under 18</Label>
                <p className="text-[10px] text-muted-foreground">Guardian consent will be mandatory</p>
              </div>
            </div>
            {form.isMinor && (
              <div className="space-y-2">
                <Label>Guardian/Parent Name *</Label>
                <Input value={form.guardianName} onChange={e => setForm(p => ({ ...p, guardianName: e.target.value }))} placeholder="Guardian full name" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anaesthesia Dialog */}
      <Dialog open={showAnaesthesia} onOpenChange={setShowAnaesthesia}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Anaesthesia Administration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Type of Anaesthesia *</Label>
              <Select value={anaesthesiaForm.anaesthesiaType} onValueChange={v => setAnaesthesiaForm(p => ({ ...p, anaesthesiaType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Spinal">Spinal</SelectItem>
                  <SelectItem value="Epidural">Epidural</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                  <SelectItem value="Regional">Regional Block</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Drugs Administered</Label>
              <Textarea value={anaesthesiaForm.drugsAdministered} onChange={e => setAnaesthesiaForm(p => ({ ...p, drugsAdministered: e.target.value }))} rows={2} placeholder="Drug names, doses, routes..." />
            </div>
            <div><Label className="text-xs">Intraoperative Monitoring</Label>
              <Textarea value={anaesthesiaForm.intraopMonitoring} onChange={e => setAnaesthesiaForm(p => ({ ...p, intraopMonitoring: e.target.value }))} rows={2} placeholder="BP, HR, SpO2, EtCO2..." />
            </div>
            <div><Label className="text-xs">Recovery Vitals</Label>
              <Textarea value={anaesthesiaForm.recoveryVitals} onChange={e => setAnaesthesiaForm(p => ({ ...p, recoveryVitals: e.target.value }))} rows={2} placeholder="Post-op vitals..." />
            </div>
            <div><Label className="text-xs">Post-Anaesthesia Status</Label>
              <Select value={anaesthesiaForm.postAnaesthesiaStatus} onValueChange={v => setAnaesthesiaForm(p => ({ ...p, postAnaesthesiaStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Oriented">Oriented</SelectItem>
                  <SelectItem value="Disoriented">Disoriented</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnaesthesia(false)}>Cancel</Button>
            <Button onClick={saveAnaesthesia}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consent Dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Surgical Consent Form</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-foreground">Patient: <strong>{selectedSchedule?.patientName}</strong></p>
            <p className="text-sm text-foreground">Procedure: <strong>{selectedSchedule?.surgeryType}</strong></p>
            {selectedSchedule?.isMinor && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <User className="h-3 w-3" /> Minor Patient — Guardian consent required
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Guardian: {selectedSchedule.guardianName || 'Not provided'}</p>
              </div>
            )}
            <div className="flex items-center gap-2 p-3 border rounded">
              <Checkbox id="consent" />
              <label htmlFor="consent" className="text-xs">
                I consent to the above procedure and understand the risks involved.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsent(false)}>Cancel</Button>
            <Button onClick={signConsent}><FileSignature className="h-4 w-4 mr-1" /> Sign Consent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
