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
import { Truck, AlertTriangle, Clock, Plus, MapPin, Navigation, Loader2, Phone, Map } from 'lucide-react';
import { useAmbulanceDispatch } from '@/hooks/useAmbulanceDispatch';
import { AmbulanceTrackingMap } from '@/components/ambulance/AmbulanceTrackingMap';

export const AmbulanceStaffWorkflow = () => {
  const { dispatches, loading, active, inTransit, completedToday, createDispatch, updateStatus } = useAmbulanceDispatch();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ patient_name: '', pickup_location: '', destination: '', priority: 'urgent', ambulance_unit: 'AMB-01', contact_phone: '', notes: '' });

  const statusFlow: Record<string, string> = {
    dispatched: 'en_route', en_route: 'on_scene', on_scene: 'transporting', transporting: 'delivered', delivered: 'completed',
  };

  const priorityColor = (p: string) => {
    switch (p) { case 'emergency': return 'bg-destructive/10 text-destructive'; case 'urgent': return 'bg-amber-100 text-amber-800'; default: return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ambulance & Transport</h1>
          <p className="text-muted-foreground">Emergency dispatch, GPS tracking & patient transport</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-1 bg-destructive hover:bg-destructive/90"><Plus className="h-4 w-4" /> New Dispatch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Emergency Dispatch</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Patient / Caller</Label><Input value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} /></div>
              <div className="space-y-1"><Label>Pickup Location</Label><Input value={form.pickup_location} onChange={e => setForm({...form, pickup_location: e.target.value})} placeholder="Address or landmark" /></div>
              <div className="space-y-1"><Label>Destination</Label><Input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="emergency">🔴 Emergency</SelectItem><SelectItem value="urgent">🟡 Urgent</SelectItem><SelectItem value="routine">🟢 Routine</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Unit</Label>
                  <Select value={form.ambulance_unit} onValueChange={v => setForm({...form, ambulance_unit: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="AMB-01">AMB-01</SelectItem><SelectItem value="AMB-02">AMB-02</SelectItem><SelectItem value="AMB-03">AMB-03</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Contact Phone</Label><Input type="tel" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} /></div>
              <div className="space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
              <Button className="w-full bg-destructive hover:bg-destructive/90" onClick={async () => { await createDispatch(form as any); setShowAdd(false); }}>Dispatch Now</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Active Calls</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{active.length}</p></CardContent></Card>
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5 text-primary" /> In Transit</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{inTransit.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> Completed Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{completedToday.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Dispatch Board</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            dispatches.length === 0 ? <p className="text-muted-foreground text-center py-4">No dispatches</p> : (
              <div className="space-y-2">
                {dispatches.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{d.patient_name} — {d.ambulance_unit}</p>
                      <p className="text-sm text-muted-foreground"><MapPin className="inline h-3 w-3" /> {d.pickup_location} → <Navigation className="inline h-3 w-3" /> {d.destination}</p>
                      {d.contact_phone && <p className="text-xs text-muted-foreground"><Phone className="inline h-3 w-3" /> {d.contact_phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={priorityColor(d.priority)}>{d.priority}</Badge>
                      <Badge variant="outline">{d.status.replace(/_/g, ' ')}</Badge>
                      {statusFlow[d.status] && <Button size="sm" onClick={() => updateStatus(d.id, statusFlow[d.status])}>{statusFlow[d.status].replace(/_/g, ' ')}</Button>}
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
