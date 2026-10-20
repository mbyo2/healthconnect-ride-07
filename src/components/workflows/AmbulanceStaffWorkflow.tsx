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
import { Truck, AlertTriangle, Clock, Plus, MapPin, Navigation, Loader2, Phone, Map, LocateFixed, LocateOff } from 'lucide-react';
import { useAmbulanceDispatch } from '@/hooks/useAmbulanceDispatch';
import { useAmbulancePositionPublisher, useLatestAmbulancePositions, positionAgeLabel } from '@/hooks/useAmbulancePosition';
import { AmbulanceTrackingMap } from '@/components/ambulance/AmbulanceTrackingMap';

const MOVING_STATUSES = ['en_route', 'on_scene', 'transporting'];

export const AmbulanceStaffWorkflow = () => {
  const { dispatches, loading, active, inTransit, completedToday, createDispatch, updateStatus } = useAmbulanceDispatch();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  // Crew GPS: the dispatch this device is publishing its position for.
  const [sharingId, setSharingId] = useState<string | null>(null);

  const sharingDispatch = dispatches.find(d => d.id === sharingId) || null;
  const publisher = useAmbulancePositionPublisher({
    dispatchId: sharingId,
    institutionId: sharingDispatch?.institution_id ?? null,
  });

  // Stop publishing automatically once the run leaves a moving status.
  React.useEffect(() => {
    if (sharingId && (!sharingDispatch || !MOVING_STATUSES.includes(sharingDispatch.status))) {
      setSharingId(null);
    }
  }, [sharingId, sharingDispatch]);

  // Latest live position per active dispatch for the board.
  const latestPositions = useLatestAmbulancePositions(active.map(d => d.id));
  const [form, setForm] = useState({ patient_name: '', pickup_location: '', destination: '', priority: 'urgent', ambulance_unit: 'AMB-01', contact_phone: '', notes: '' });

  const statusFlow: Record<string, string> = {
    dispatched: 'en_route', en_route: 'on_scene', on_scene: 'transporting', transporting: 'delivered', delivered: 'completed',
  };

  const priorityColor = (p: string) => {
    switch (p) { case 'emergency': return 'bg-destructive/10 text-destructive'; case 'urgent': return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'; default: return ''; }
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
                    <SelectContent><SelectItem value="emergency"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" aria-hidden /> Emergency</span></SelectItem><SelectItem value="urgent"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden /> Urgent</span></SelectItem><SelectItem value="routine"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Routine</span></SelectItem></SelectContent>
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

      {sharingId && sharingDispatch && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            publisher.error
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-primary/30 bg-primary/5 text-foreground'
          }`}
          role="status"
        >
          {publisher.sharing ? <LocateFixed className="h-4 w-4 shrink-0 text-primary" /> : <LocateOff className="h-4 w-4 shrink-0 text-muted-foreground" />}
          {publisher.error ? (
            <span>{publisher.error}</span>
          ) : publisher.sharing ? (
            <span>
              Sharing this device's live location for <strong>{sharingDispatch.ambulance_unit}</strong>
              {publisher.lastPosition && <> · {publisher.lastPosition.lat.toFixed(5)}, {publisher.lastPosition.lng.toFixed(5)}</>}
              {' '}— the dispatch board sees the unit move in near-real time.
            </span>
          ) : (
            <span>Starting location sharing for {sharingDispatch.ambulance_unit}…</span>
          )}
          <Button size="sm" variant="outline" className="ml-auto shrink-0" onClick={() => setSharingId(null)}>Stop</Button>
        </div>
      )}

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map"><Map className="h-4 w-4 mr-1" /> Live Map</TabsTrigger>
          <TabsTrigger value="board">Dispatch Board</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <AmbulanceTrackingMap
            dispatches={dispatches}
            selectedDispatchId={selectedDispatchId}
            onSelectDispatch={setSelectedDispatchId}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Dispatch Board</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
                dispatches.length === 0 ? <p className="text-muted-foreground text-center py-4">No dispatches</p> : (
                  <div className="space-y-2">
                    {dispatches.map(d => {
                      const pos = latestPositions[d.id];
                      const isMoving = MOVING_STATUSES.includes(d.status);
                      return (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{d.patient_name} — {d.ambulance_unit}</p>
                          <p className="text-sm text-muted-foreground"><MapPin className="inline h-3 w-3" /> {d.pickup_location} → <Navigation className="inline h-3 w-3" /> {d.destination}</p>
                          {d.contact_phone && <p className="text-xs text-muted-foreground"><Phone className="inline h-3 w-3" /> {d.contact_phone}</p>}
                          {isMoving && (
                            pos ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                <LocateFixed className="inline h-3 w-3 text-primary" /> Live: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · updated {positionAgeLabel(pos.recorded_at)}{' '}
                                <a
                                  className="underline underline-offset-2 font-medium"
                                  href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open in Maps
                                </a>
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                <LocateOff className="inline h-3 w-3" /> No live position yet — the crew device must start location sharing.
                              </p>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={priorityColor(d.priority)}>{d.priority}</Badge>
                          <Badge variant="outline">{d.status.replace(/_/g, ' ')}</Badge>
                          {isMoving && (
                            sharingId === d.id ? (
                              <Button size="sm" variant="outline" onClick={() => setSharingId(null)}>
                                <LocateOff className="h-3.5 w-3.5 mr-1" /> Stop sharing
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => setSharingId(d.id)}>
                                <LocateFixed className="h-3.5 w-3.5 mr-1" /> Share my location
                              </Button>
                            )
                          )}
                          {statusFlow[d.status] && <Button size="touch" className="min-h-[44px]" onClick={() => updateStatus(d.id, statusFlow[d.status])}>{statusFlow[d.status].replace(/_/g, ' ')}</Button>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
