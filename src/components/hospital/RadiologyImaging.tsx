import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image, Clock, CheckCircle2, FileText, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const RadiologyImaging = ({ hospital }: { hospital: any }) => {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ patient_name: '', exam_type: 'X-Ray', exam_name: '', body_part: '', priority: 'routine', notes: '' });
  const { data: orders, loading, error, refresh } = useHospitalModule<any>(
    'radiology_requests', 'hospital_id', hospital?.id, { orderBy: 'request_date', ascending: false }
  );
  const { nameFor } = usePatientNames(orders.map(o => o.patient_id));

  const statusColors: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
    requested: 'outline',
    scheduled: 'outline',
    in_progress: 'secondary',
    completed: 'default',
    report_pending: 'secondary',
    reported: 'default',
    cancelled: 'destructive',
  };

  // Modality mix is derived from the actual order book, not a fixed list
  const modalities = Array.from(new Set(orders.map(o => o.exam_type).filter(Boolean))).map(m => ({
    name: m,
    queue: orders.filter(o => o.exam_type === m && !['reported', 'completed', 'cancelled'].includes(o.status)).length,
    total: orders.filter(o => o.exam_type === m).length,
  }));

  const handleNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exam_type) return;
    setIsSubmitting(true);
    try {
      const reqNum = `RAD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const { error: err } = await (supabase.from('radiology_requests' as any) as any).insert({
        hospital_id: hospital.id,
        request_number: reqNum,
        exam_type: form.exam_type,
        exam_name: form.exam_name || form.exam_type,
        body_part: form.body_part,
        priority: form.priority,
        notes: form.notes,
        status: 'requested',
        request_date: new Date().toISOString().split('T')[0],
      });
      if (err) throw err;
      toast.success(`Imaging order ${reqNum} created`);
      setShowNewOrder(false);
      setForm({ patient_name: '', exam_type: 'X-Ray', exam_name: '', body_part: '', priority: 'routine', notes: '' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create imaging order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setStatus = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from('radiology_requests' as any) as any)
        .update({ status, ...(status === 'reported' ? { report_date: new Date().toISOString() } : {}) })
        .eq('id', row.id);
      if (err) throw err;
      toast.success(`Study marked ${status.replace('_', ' ')}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update study');
    }
  };

  const pending = orders.filter(o => !['reported', 'cancelled'].includes(o.status)).length;
  const reported = orders.filter(o => o.status === 'reported').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Radiology & Imaging</h3>
          <p className="text-sm text-muted-foreground">Order book, scheduling and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={() => setShowNewOrder(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Imaging Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Image className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total Studies</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{reported}</p>
          <p className="text-xs text-muted-foreground">Reported</p>
        </CardContent></Card>
      </div>

      {modalities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {modalities.map(m => (
            <Badge key={m.name} variant="outline" className="text-[10px]">
              {m.name}: {m.queue} in queue / {m.total} total
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Image} title="Could not load imaging orders" description={error} actionLabel="Retry" onAction={refresh} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No imaging orders yet"
          description="Radiology requests raised from OPD, IPD or theatre appear here."
          actionLabel="Create New Order"
          onAction={() => setShowNewOrder(true)}
        />
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{nameFor(o.patient_id)}</span>
                    <Badge variant={statusColors[o.status] || 'outline'} className="text-[10px] capitalize">
                      {(o.status || '').replace('_', ' ')}
                    </Badge>
                    {o.priority && <Badge variant="outline" className="text-[10px] capitalize">{o.priority}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {o.request_number} • {o.exam_type} — {o.exam_name || o.body_part || 'Study'}
                    {o.scheduled_date ? ` • ${o.scheduled_date}${o.scheduled_time ? ` ${o.scheduled_time}` : ''}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  {['requested', 'scheduled'].includes(o.status) && (
                    <Button size="sm" className="text-xs" onClick={() => setStatus(o, 'in_progress')}>Start</Button>
                  )}
                  {o.status === 'in_progress' && (
                    <Button size="sm" className="text-xs" onClick={() => setStatus(o, 'report_pending')}>Finish Scan</Button>
                  )}
                  {o.status === 'report_pending' && (
                    <Button size="sm" className="text-xs gap-1" onClick={() => setStatus(o, 'reported')}>
                      <FileText className="h-3 w-3" /> Sign Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Imaging Order Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>New Imaging Order</DialogTitle></DialogHeader>
          <form onSubmit={handleNewOrder} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Modality *</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.exam_type} onChange={e => setForm({...form, exam_type: e.target.value})}>
                  {['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'DEXA Scan', 'PET Scan', 'Fluoroscopy', 'Echocardiogram', 'ECG'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority</Label>
                <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Body Part / Region</Label>
              <Input value={form.body_part} onChange={e => setForm({...form, body_part: e.target.value})} placeholder="e.g. Chest, Abdomen, Right Knee" />
            </div>
            <div>
              <Label>Study Name (optional)</Label>
              <Input value={form.exam_name} onChange={e => setForm({...form, exam_name: e.target.value})} placeholder="e.g. Chest X-Ray PA view" />
            </div>
            <div>
              <Label>Clinical Notes</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Clinical indication or history" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowNewOrder(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Create Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
