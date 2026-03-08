import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, Calendar, Plus, Loader2, Clock, CheckCircle, Users, FileText } from 'lucide-react';
import { useSpecialistSessions } from '@/hooks/useSpecialistSessions';

const SPECIALTY_TYPES = [
  { value: 'dialysis', label: 'Dialysis' },
  { value: 'ivf', label: 'IVF / Fertility' },
  { value: 'chemotherapy', label: 'Chemotherapy' },
  { value: 'physiotherapy', label: 'Physiotherapy' },
  { value: 'radiation_therapy', label: 'Radiation Therapy' },
];

export const SpecialistWorkflow = () => {
  const { templates, sessions, loading, todaySessions, activeSessions, createSession, updateSession } = useSpecialistSessions();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    patient_name: '', specialty_type: 'dialysis', session_number: 1, total_sessions: 12,
    session_date: new Date().toISOString().split('T')[0], protocol_notes: '',
  });

  const statusColor = (s: string) => {
    switch (s) { case 'in_progress': return 'bg-amber-100 text-amber-800'; case 'completed': return 'bg-green-100 text-green-800'; default: return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Specialist Dashboard</h1>
          <p className="text-muted-foreground">Dialysis, IVF, Chemotherapy & specialty session management</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> New Session</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Specialist Session</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Specialty Type</Label>
                <Select value={form.specialty_type} onValueChange={v => setForm({...form, specialty_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPECIALTY_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label>Session #</Label><Input type="number" value={form.session_number} onChange={e => setForm({...form, session_number: +e.target.value})} /></div>
                <div className="space-y-1"><Label>Total Sessions</Label><Input type="number" value={form.total_sessions} onChange={e => setForm({...form, total_sessions: +e.target.value})} /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.session_date} onChange={e => setForm({...form, session_date: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><Label>Protocol Notes</Label><Textarea value={form.protocol_notes} onChange={e => setForm({...form, protocol_notes: e.target.value})} rows={3} placeholder="Pre-session notes, protocol details..." /></div>
              <Button className="w-full" onClick={async () => { await createSession(form as any); setShowAdd(false); }}>Schedule Session</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-primary" /> Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{todaySessions.length}</p><p className="text-sm text-muted-foreground">sessions</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> Active</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{activeSessions.length}</p><p className="text-sm text-muted-foreground">in progress</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Patients</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{new Set(sessions.map(s => s.patient_name)).size}</p><p className="text-sm text-muted-foreground">unique</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Templates</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{templates.length}</p><p className="text-sm text-muted-foreground">protocols</p></CardContent></Card>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList><TabsTrigger value="sessions">Sessions</TabsTrigger><TabsTrigger value="templates">Protocol Templates</TabsTrigger></TabsList>
        <TabsContent value="sessions">
          <Card>
            <CardContent className="pt-4">
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
                sessions.length === 0 ? <p className="text-muted-foreground text-center py-4">No sessions yet</p> : (
                  <div className="space-y-2">
                    {sessions.slice(0, 50).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{s.patient_name} — {SPECIALTY_TYPES.find(t => t.value === s.specialty_type)?.label || s.specialty_type}</p>
                          <p className="text-sm text-muted-foreground">Session {s.session_number}{s.total_sessions ? `/${s.total_sessions}` : ''} • {s.session_date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
                          {s.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => updateSession(s.id, { status: 'in_progress', start_time: new Date().toISOString() })}>Start</Button>}
                          {s.status === 'in_progress' && <Button size="sm" onClick={() => updateSession(s.id, { status: 'completed', end_time: new Date().toISOString(), outcome: 'successful' })}><CheckCircle className="h-3 w-3 mr-1" /> Complete</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="templates">
          <Card>
            <CardContent className="pt-4">
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No protocol templates defined yet</p>
                  <p className="text-sm text-muted-foreground">Templates can be created by institution admins to standardize session protocols for dialysis, IVF, chemotherapy etc.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="p-3 rounded-lg border">
                      <p className="font-medium">{t.template_name}</p>
                      <p className="text-sm text-muted-foreground">{t.specialty_type} • {t.default_duration_minutes}min • {(t.required_equipment || []).length} equipment items</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
