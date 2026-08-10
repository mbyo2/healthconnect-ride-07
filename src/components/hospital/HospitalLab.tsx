import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TestTube, Clock, CheckCircle2, AlertCircle, Printer, Timer, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pending Collection', variant: 'outline' },
  ordered: { label: 'Pending Collection', variant: 'outline' },
  sample_collected: { label: 'Sample Collected', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'default' },
  report_ready: { label: 'Report Ready', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export const HospitalLab = ({ hospital }: { hospital: any }) => {
  const [filter, setFilter] = useState('all');
  const [showPendingPrompt, setShowPendingPrompt] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState<any>(null);
  const [resultInput, setResultInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderForm, setOrderForm] = useState({
    patient_name: '',
    test_type: 'Complete Blood Count (CBC)',
    test_category: 'Hematology',
    priority: 'routine',
    sample_type: 'Blood',
  });

  const { data: labOrders, loading, error, refresh } = useHospitalModule<any>(
    'lab_tests', 'lab_id', hospital?.id, { orderBy: 'created_at', ascending: false }
  );
  const { data: reflexTests } = useHospitalModule<any>(
    'lab_reflex_tests', 'hospital_id', hospital?.id, { orderBy: 'created_at', ascending: false, limit: 20 }
  );
  const { nameFor } = usePatientNames(labOrders.map(o => o.patient_id));

  const filtered = filter === 'all' ? labOrders : labOrders.filter(o => o.status === filter);

  const pendingOverAnHour = labOrders.filter(o => {
    if (!['pending', 'ordered'].includes(o.status) || o.sample_collected_at) return false;
    return Date.now() - new Date(o.created_at).getTime() > 60 * 60 * 1000;
  });

  const stats = {
    pending: labOrders.filter(o => ['pending', 'ordered'].includes(o.status)).length,
    processing: labOrders.filter(o => ['sample_collected', 'processing'].includes(o.status)).length,
    completed: labOrders.filter(o => ['completed', 'report_ready'].includes(o.status)).length,
    urgent: labOrders.filter(o => o.priority && o.priority !== 'routine').length,
  };

  const handleOrderLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.test_type) return;
    setIsSubmitting(true);
    try {
      const testNum = `LAB-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const { error: err } = await (supabase.from('lab_tests' as any) as any).insert({
        lab_id: hospital.id,
        test_number: testNum,
        test_type: orderForm.test_type,
        test_category: orderForm.test_category,
        priority: orderForm.priority,
        sample_type: orderForm.sample_type,
        status: 'pending',
        payment_status: 'pending',
        price: 200,
      });
      if (err) throw err;
      toast.success(`Lab Test ${testNum} ordered successfully`);
      setShowOrderDialog(false);
      setOrderForm({ patient_name: '', test_type: 'Complete Blood Count (CBC)', test_category: 'Hematology', priority: 'routine', sample_type: 'Blood' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to order lab test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitResult = async () => {
    if (!showResultDialog || !resultInput.trim()) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from('lab_tests' as any) as any).update({
        status: 'completed',
        result_summary: resultInput,
        results_date: new Date().toISOString(),
      }).eq('id', showResultDialog.id);

      if (err) throw err;
      toast.success('Lab test result submitted and released');
      setShowResultDialog(null);
      setResultInput('');
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const advance = async (order: any, status: string) => {
    try {
      const patch: any = { status };
      if (status === 'sample_collected') patch.sample_collected_at = new Date().toISOString();
      if (status === 'completed') patch.results_date = new Date().toISOString();
      const { error: err } = await (supabase.from('lab_tests' as any) as any).update(patch).eq('id', order.id);
      if (err) throw err;
      toast.success(`${order.test_number || 'Order'} → ${statusConfig[status]?.label || status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update lab order');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Laboratory Information System (LIMS)</h3>
          <p className="text-sm text-muted-foreground">Sample lifecycle, reflex rules and report dispatch</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setShowOrderDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Order Lab Test
          </Button>
        </div>
      </div>

      {pendingOverAnHour.length > 0 && showPendingPrompt && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Timer className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {pendingOverAnHour.length} sample(s) pending collection for more than 1 hour
                </p>
                {pendingOverAnHour.slice(0, 5).map(o => (
                  <p key={o.id} className="text-xs text-muted-foreground mt-1">
                    {nameFor(o.patient_id)} — {o.test_type} — ordered {new Date(o.created_at).toLocaleString()}
                  </p>
                ))}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setShowPendingPrompt(false)}>✕</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" /><p className="text-2xl font-bold text-foreground">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TestTube className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{stats.processing}</p><p className="text-xs text-muted-foreground">Processing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" /><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertCircle className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-2xl font-bold text-foreground">{stats.urgent}</p><p className="text-xs text-muted-foreground">Urgent/STAT</p>
        </CardContent></Card>
      </div>

      {reflexTests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> Reflex Test Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {reflexTests.map(r => (
                <div key={r.id} className="p-2 border rounded text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{r.primary_test_name}</span>
                    <Badge variant={r.is_active ? 'default' : 'secondary'} className="text-[8px]">{r.is_active ? 'Active' : 'Off'}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    If {r.trigger_condition} → auto-add <strong>{r.reflex_test_name}</strong>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'sample_collected', 'processing', 'completed'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)} className="text-xs capitalize">
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={TestTube} title="Could not load lab orders" description={error} actionLabel="Retry" onAction={refresh} />
      ) : filtered.length === 0 ? (
        <EmptyState 
          icon={TestTube} 
          title="No lab orders" 
          description="Order lab tests directly or process incoming orders from OPD/IPD."
          actionLabel="Order First Lab Test"
          onAction={() => setShowOrderDialog(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id} className={order.priority === 'stat' ? 'border-destructive/40' : order.priority === 'urgent' ? 'border-amber-500/40' : ''}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{nameFor(order.patient_id) || 'Hospital Patient'}</span>
                    <Badge variant={statusConfig[order.status]?.variant || 'outline'} className="text-[10px]">
                      {statusConfig[order.status]?.label || order.status}
                    </Badge>
                    {order.priority && order.priority !== 'routine' && (
                      <Badge variant="destructive" className="text-[10px] uppercase">{order.priority}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.test_number} • {order.test_type}{order.test_category ? ` (${order.test_category})` : ''} • Ordered {new Date(order.created_at).toLocaleString()}
                    {order.sample_type ? ` • Sample: ${order.sample_type}` : ''}
                  </p>
                  {order.result_summary && (
                    <p className="text-xs text-foreground font-medium mt-1">Result: {order.result_summary}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {['pending', 'ordered'].includes(order.status) && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => advance(order, 'sample_collected')}>Collect Sample</Button>
                  )}
                  {order.status === 'sample_collected' && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => advance(order, 'processing')}>Start Processing</Button>
                  )}
                  {['processing', 'sample_collected'].includes(order.status) && (
                    <Button size="sm" className="text-xs" onClick={() => { setShowResultDialog(order); setResultInput(order.result_summary || ''); }}>Enter Result</Button>
                  )}
                  {['completed', 'report_ready'].includes(order.status) && (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => window.print()}>
                      <Printer className="h-3 w-3" /> Print
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Lab Test Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Order Laboratory Test</DialogTitle></DialogHeader>
          <form onSubmit={handleOrderLab} className="space-y-3 py-2">
            <div>
              <Label>Test Name *</Label>
              <Input value={orderForm.test_type} onChange={e => setOrderForm({ ...orderForm, test_type: e.target.value })} placeholder="e.g. Lipid Profile / Full Blood Count" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Category</Label>
                <Input value={orderForm.test_category} onChange={e => setOrderForm({ ...orderForm, test_category: e.target.value })} placeholder="e.g. Biochemistry" />
              </div>
              <div>
                <Label>Sample Type</Label>
                <Input value={orderForm.sample_type} onChange={e => setOrderForm({ ...orderForm, sample_type: e.target.value })} placeholder="e.g. Blood, Urine" />
              </div>
            </div>
            <div>
              <Label>Priority</Label>
              <select className="w-full h-10 border rounded-md px-3 bg-background text-sm" value={orderForm.priority} onChange={e => setOrderForm({ ...orderForm, priority: e.target.value })}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT (Immediate)</option>
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowOrderDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Order Test</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Enter Result Dialog */}
      <Dialog open={!!showResultDialog} onOpenChange={(o) => !o && setShowResultDialog(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Enter Test Result — {showResultDialog?.test_type}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Result Value / Summary *</Label>
              <textarea
                className="w-full h-24 border rounded-md p-3 text-sm bg-background"
                placeholder="Enter quantitative values or findings (e.g. Hemoglobin 14.2 g/dL - Normal)"
                value={resultInput}
                onChange={e => setResultInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultDialog(null)}>Cancel</Button>
            <Button onClick={submitResult} disabled={!resultInput.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Submit & Release Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
