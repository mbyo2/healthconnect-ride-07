import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Scissors, Clock, Calendar } from 'lucide-react';
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
}

export const OTManagement = () => {
  const [schedules, setSchedules] = useState<OTSchedule[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1',
    date: '', time: '', duration: '60', anesthetist: '', preOpNotes: ''
  });

  const addSchedule = () => {
    if (!form.patientName || !form.surgeryType || !form.date || !form.time) {
      toast.error('Please fill required fields');
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
      preOpNotes: form.preOpNotes
    };
    setSchedules(prev => [...prev, schedule]);
    setForm({ patientName: '', surgeryType: '', surgeon: '', otRoom: 'OT-1', date: '', time: '', duration: '60', anesthetist: '', preOpNotes: '' });
    setShowDialog(false);
    toast.success('Surgery scheduled successfully');
  };

  const updateStatus = (id: string, status: OTSchedule['status']) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    toast.success(`Surgery status updated`);
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{todaySchedules.length}</p>
                <p className="text-xs text-muted-foreground">Today's Surgeries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{schedules.filter(s => s.status === 'in-progress').length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{schedules.filter(s => s.status === 'scheduled').length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Operation Theatre Schedule</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Schedule Surgery
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">{schedule.patientName}</h4>
                      <Badge variant={getStatusColor(schedule.status) as any}>{schedule.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{schedule.otRoom}</Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{schedule.surgeryType}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>Surgeon: {schedule.surgeon || 'TBD'}</span>
                      <span>Date: {schedule.date} at {schedule.time}</span>
                      <span>Duration: {schedule.duration} min</span>
                      {schedule.anesthetist && <span>Anesthetist: {schedule.anesthetist}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {schedule.status === 'scheduled' && (
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Schedule Surgery</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patient Name *</Label>
                <Input value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Surgery Type *</Label>
                <Input value={form.surgeryType} onChange={e => setForm(p => ({ ...p, surgeryType: e.target.value }))} placeholder="e.g., Appendectomy" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Surgeon</Label>
                <Input value={form.surgeon} onChange={e => setForm(p => ({ ...p, surgeon: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Anesthetist</Label>
                <Input value={form.anesthetist} onChange={e => setForm(p => ({ ...p, anesthetist: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>OT Room</Label>
              <Select value={form.otRoom} onValueChange={v => setForm(p => ({ ...p, otRoom: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['OT-1', 'OT-2', 'OT-3', 'OT-4', 'Minor OT'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={addSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
