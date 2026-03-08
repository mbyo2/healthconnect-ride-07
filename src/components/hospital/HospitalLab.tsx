import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TestTube, Search, Clock, CheckCircle2, AlertCircle, Plus, Printer, Timer, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export const HospitalLab = ({ hospital }: { hospital: any }) => {
  const [filter, setFilter] = useState('all');
  const [showPendingPrompt, setShowPendingPrompt] = useState(true);

  const [labOrders, setLabOrders] = useState([
    { id: 'LAB-001', patient: 'John Mwale', uhid: 'UH-001', tests: ['CBC', 'LFT', 'RFT'], doctor: 'Dr. Banda', ordered: '2026-03-04 08:30', status: 'sample_collected', priority: 'routine', sampleId: 'S-2026-001', isOutsourced: false, outsourcedLab: '', reportReceivedAt: '' },
    { id: 'LAB-002', patient: 'Mary Phiri', uhid: 'UH-002', tests: ['Blood Sugar (F)', 'HbA1c'], doctor: 'Dr. Tembo', ordered: '2026-03-04 09:15', status: 'processing', priority: 'urgent', sampleId: 'S-2026-002', isOutsourced: false, outsourcedLab: '', reportReceivedAt: '' },
    { id: 'LAB-003', patient: 'Peter Zulu', uhid: 'UH-003', tests: ['Lipid Profile', 'TSH'], doctor: 'Dr. Mulenga', ordered: '2026-03-04 07:45', status: 'completed', priority: 'routine', sampleId: 'S-2026-003', isOutsourced: true, outsourcedLab: 'MetroPath Labs', reportReceivedAt: '2026-03-04 14:30' },
    { id: 'LAB-004', patient: 'Grace Banda', uhid: 'UH-004', tests: ['Urine R/M', 'Culture'], doctor: 'Dr. Chanda', ordered: '2026-03-04 10:00', status: 'pending', priority: 'stat', sampleId: null, isOutsourced: false, outsourcedLab: '', reportReceivedAt: '' },
    { id: 'LAB-005', patient: 'David Mumba', uhid: 'UH-005', tests: ['ECG', 'Troponin'], doctor: 'Dr. Banda', ordered: '2026-03-03 16:00', status: 'report_ready', priority: 'urgent', sampleId: 'S-2026-004', isOutsourced: false, outsourcedLab: '', reportReceivedAt: '' },
  ]);

  // Reflex test config (mock)
  const [reflexTests] = useState([
    { primary: 'Urea', condition: 'value > 40 mg/dL', reflex: 'Creatinine', active: true },
    { primary: 'TSH', condition: 'value > 10 mIU/L', reflex: 'Free T4', active: true },
    { primary: 'Hemoglobin', condition: 'value < 8 g/dL', reflex: 'Peripheral Smear', active: true },
  ]);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    pending: { label: 'Pending Collection', variant: 'outline' },
    sample_collected: { label: 'Sample Collected', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'secondary' },
    completed: { label: 'Completed', variant: 'default' },
    report_ready: { label: 'Report Ready', variant: 'default' },
  };

  const filtered = filter === 'all' ? labOrders : labOrders.filter(o => o.status === filter);
  const pendingOver1Hour = labOrders.filter(o => {
    if (o.status !== 'pending' || o.sampleId) return false;
    const ordered = new Date(o.ordered).getTime();
    return Date.now() - ordered > 60 * 60 * 1000;
  });

  const stats = {
    pending: labOrders.filter(o => o.status === 'pending').length,
    processing: labOrders.filter(o => ['sample_collected', 'processing'].includes(o.status)).length,
    completed: labOrders.filter(o => ['completed', 'report_ready'].includes(o.status)).length,
    urgent: labOrders.filter(o => o.priority !== 'routine').length,
    outsourced: labOrders.filter(o => o.isOutsourced).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Laboratory Information System (LIMS)</h3>
          <p className="text-sm text-muted-foreground">Sample lifecycle, reflex tests, outsourced tracking & report dispatch</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Lab Order</Button>
          <Button size="sm" variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" /> Reflex Config</Button>
        </div>
      </div>

      {/* Pending Samples Alert */}
      {pendingOver1Hour.length > 0 && showPendingPrompt && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Timer className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Pending Samples Alert — {pendingOver1Hour.length} sample(s) pending &gt; 1 hour</p>
                  {pendingOver1Hour.map(o => (
                    <p key={o.id} className="text-xs text-muted-foreground mt-1">
                      {o.patient} ({o.uhid}) — {o.tests.join(', ')} — Ordered: {o.ordered}
                    </p>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowPendingPrompt(false)}>✕</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
        <Card><CardContent className="pt-4 text-center">
          <ExternalLink className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{stats.outsourced}</p><p className="text-xs text-muted-foreground">Outsourced</p>
        </CardContent></Card>
      </div>

      {/* Reflex Tests */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-primary" /> Reflex Test Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {reflexTests.map((r, i) => (
              <div key={i} className="p-2 border rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{r.primary}</span>
                  <Badge variant={r.active ? 'default' : 'secondary'} className="text-[8px]">{r.active ? 'Active' : 'Off'}</Badge>
                </div>
                <p className="text-muted-foreground mt-1">If {r.condition} → auto-add <strong>{r.reflex}</strong></p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'sample_collected', 'processing', 'completed', 'report_ready'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)} className="text-xs capitalize">
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-3">
        {filtered.map(order => (
          <Card key={order.id} className={order.priority === 'stat' ? 'border-destructive/40' : order.priority === 'urgent' ? 'border-amber-500/40' : ''}>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{order.patient}</span>
                    <span className="text-xs text-muted-foreground">({order.uhid})</span>
                    <Badge variant={statusConfig[order.status]?.variant || 'outline'} className="text-[10px]">
                      {statusConfig[order.status]?.label}
                    </Badge>
                    {order.priority !== 'routine' && (
                      <Badge variant="destructive" className="text-[10px] uppercase">{order.priority}</Badge>
                    )}
                    {order.isOutsourced && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
                        <ExternalLink className="h-2 w-2 mr-1" /> Outsourced: {order.outsourcedLab}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.id} • {order.doctor} • Ordered: {order.ordered}
                    {order.sampleId && ` • Sample: ${order.sampleId}`}
                    {order.isOutsourced && order.reportReceivedAt && ` • Report received: ${order.reportReceivedAt}`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {order.tests.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-1">
                  {order.status === 'pending' && <Button size="sm" variant="outline" className="text-xs">Collect Sample</Button>}
                  {order.status === 'sample_collected' && <Button size="sm" variant="outline" className="text-xs">Start Processing</Button>}
                  {order.status === 'processing' && <Button size="sm" className="text-xs">Enter Results</Button>}
                  {(order.status === 'completed' || order.status === 'report_ready') && (
                    <Button size="sm" variant="outline" className="text-xs gap-1"><Printer className="h-3 w-3" /> Print Report</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
