import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Scissors, Clock, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useInstitutionAffiliation } from '@/hooks/useInstitutionAffiliation';
import { toast } from 'sonner';

interface Surgery {
  id: string;
  patient_name: string;
  procedure_name: string;
  ot_room: string;
  scheduled_time: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  surgeon_name: string;
  anaesthesia_type: string;
  consent_signed: boolean;
  notes: string | null;
}

export const OTStaffWorkflow = () => {
  const { user } = useAuth();
  const { institutionId } = useInstitutionAffiliation();
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_name: '', procedure_name: '', ot_room: 'OT-1', scheduled_time: '', surgeon_name: '', anaesthesia_type: 'general', notes: '' });

  const fetchSurgeries = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('ot_surgeries')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setSurgeries((data || []).map((s: any) => ({
        id: s.id,
        patient_name: s.patient_name,
        procedure_name: s.procedure_name,
        ot_room: s.ot_room,
        scheduled_time: s.scheduled_time,
        status: s.status,
        surgeon_name: s.surgeon_name,
        anaesthesia_type: s.anaesthesia_type,
        consent_signed: s.consent_signed,
        notes: s.notes,
      })));
    } catch (err) {
      console.error('Error fetching surgeries:', err);
    }
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { fetchSurgeries(); }, [fetchSurgeries]);

  const handleCreate = async () => {
    if (!institutionId || !user) return;
    try {
      const { error } = await supabase.from('ot_surgeries').insert({
        institution_id: institutionId,
        patient_name: form.patient_name,
        procedure_name: form.procedure_name,
        ot_room: form.ot_room,
        scheduled_time: form.scheduled_time || '08:00',
        surgeon_name: form.surgeon_name,
        anaesthesia_type: form.anaesthesia_type,
        notes: form.notes || null,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success('Surgery scheduled');
      setShowAdd(false);
      setForm({ patient_name: '', procedure_name: '', ot_room: 'OT-1', scheduled_time: '', surgeon_name: '', anaesthesia_type: 'general', notes: '' });
      fetchSurgeries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule surgery');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('ot_surgeries').update(updates).eq('id', id);
      if (error) throw error;
      setSurgeries(prev => prev.map(s => s.id === id ? { ...s, status: status as any } : s));
      toast.success(`Surgery marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'in_progress': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-primary/10 text-primary';
    }
  };

  const todayCount = surgeries.filter(s => s.status !== 'cancelled').length;
  const inProgress = surgeries.filter(s => s.status === 'in_progress').length;
  const emergency = surgeries.filter(s => s.ot_room === 'Emergency').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operation Theatre Dashboard</h1>
          <p className="text-muted-foreground">Surgical scheduling, consent tracking & anaesthesia logs</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="h-4 w-4" /> Schedule Surgery</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule New Surgery</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Patient Name</Label><Input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Procedure</Label><Input value={form.procedure_name} onChange={e => setForm({...form, procedure_name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>OT Room</Label>
                  <Select value={form.ot_room} onValueChange={v => setForm({...form, ot_room: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="OT-1">OT-1</SelectItem><SelectItem value="OT-2">OT-2</SelectItem><SelectItem value="OT-3">OT-3</SelectItem><SelectItem value="Emergency">Emergency OT</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Time</Label><Input type="time" value={form.scheduled_time} onChange={e => setForm({...form, scheduled_time: e.target.value})} /></div>
              </div>
              <div className="space-y-1"><Label>Surgeon</Label><Input value={form.surgeon_name} onChange={e => setForm({...form, surgeon_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Anaesthesia Type</Label>
                <Select value={form.anaesthesia_type} onValueChange={v => setForm({...form, anaesthesia_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="general">General</SelectItem><SelectItem value="spinal">Spinal</SelectItem><SelectItem value="local">Local</SelectItem><SelectItem value="sedation">Sedation</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
              <Button className="w-full" onClick={handleCreate} disabled={!form.patient_name || !form.procedure_name || !form.surgeon_name}>Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Scissors className="h-5 w-5 text-primary" /> Surgeries Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{todayCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> In Progress</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{inProgress}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Emergency</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{emergency}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Today's Schedule</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            surgeries.length === 0 ? <p className="text-muted-foreground text-center py-4">No surgeries scheduled today</p> : (
              <div className="space-y-2">
                {surgeries.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{s.patient_name} — {s.procedure_name}</p>
                      <p className="text-sm text-muted-foreground">{s.ot_room} • {s.scheduled_time} • Dr. {s.surgeon_name} • {s.anaesthesia_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColor(s.status)}>{s.status}</Badge>
                      {s.status === 'scheduled' && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(s.id, 'in_progress')}>Start</Button>
                      )}
                      {s.status === 'in_progress' && (
                        <Button size="sm" onClick={() => updateStatus(s.id, 'completed')}>Complete</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>
    </div>
  );
};
