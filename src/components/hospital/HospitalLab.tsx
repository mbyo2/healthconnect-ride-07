import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TestTube, Search, Clock, CheckCircle2, AlertCircle, Plus, FileText, Printer } from 'lucide-react';

export const HospitalLab = ({ hospital }: { hospital: any }) => {
  const [filter, setFilter] = useState('all');

  const [labOrders] = useState([
    { id: 'LAB-001', patient: 'John Mwale', uhid: 'UH-001', tests: ['CBC', 'LFT', 'RFT'], doctor: 'Dr. Banda', ordered: '2026-03-04 08:30', status: 'sample_collected', priority: 'routine', sampleId: 'S-2026-001' },
    { id: 'LAB-002', patient: 'Mary Phiri', uhid: 'UH-002', tests: ['Blood Sugar (F)', 'HbA1c'], doctor: 'Dr. Tembo', ordered: '2026-03-04 09:15', status: 'processing', priority: 'urgent', sampleId: 'S-2026-002' },
    { id: 'LAB-003', patient: 'Peter Zulu', uhid: 'UH-003', tests: ['Lipid Profile', 'TSH'], doctor: 'Dr. Mulenga', ordered: '2026-03-04 07:45', status: 'completed', priority: 'routine', sampleId: 'S-2026-003' },
    { id: 'LAB-004', patient: 'Grace Banda', uhid: 'UH-004', tests: ['Urine R/M', 'Culture'], doctor: 'Dr. Chanda', ordered: '2026-03-04 10:00', status: 'pending', priority: 'stat', sampleId: null },
    { id: 'LAB-005', patient: 'David Mumba', uhid: 'UH-005', tests: ['ECG', 'Troponin'], doctor: 'Dr. Banda', ordered: '2026-03-03 16:00', status: 'report_ready', priority: 'urgent', sampleId: 'S-2026-004' },
  ]);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    pending: { label: 'Pending Collection', variant: 'outline' },
    sample_collected: { label: 'Sample Collected', variant: 'secondary' },
    processing: { label: 'Processing', variant: 'secondary' },
    completed: { label: 'Completed', variant: 'default' },
    report_ready: { label: 'Report Ready', variant: 'default' },
  };

  const filtered = filter === 'all' ? labOrders : labOrders.filter(o => o.status === filter);

  const stats = {
    pending: labOrders.filter(o => o.status === 'pending').length,
    processing: labOrders.filter(o => ['sample_collected', 'processing'].includes(o.status)).length,
    completed: labOrders.filter(o => ['completed', 'report_ready'].includes(o.status)).length,
    urgent: labOrders.filter(o => o.priority !== 'routine').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Laboratory Information System (LIMS)</h3>
          <p className="text-sm text-muted-foreground">Sample lifecycle, test processing & report dispatch</p>
        </div>
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> New Lab Order</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TestTube className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
          <p className="text-xs text-muted-foreground">Processing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.urgent}</p>
          <p className="text-xs text-muted-foreground">Urgent/STAT</p>
        </CardContent></Card>
      </div>

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
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.id} • {order.doctor} • Ordered: {order.ordered}
                    {order.sampleId && ` • Sample: ${order.sampleId}`}
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
