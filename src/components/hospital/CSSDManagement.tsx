import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Package, Clock, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';

export const CSSDManagement = ({ hospital }: { hospital: any }) => {
  const batches = [
    { id: 'CS-001', items: 'OT Kit #12 (Major Surgery)', dept: 'Surgery OT-1', loadedAt: '06:00', status: 'sterilized', cycle: 'Autoclave 134°C', indicator: 'pass' },
    { id: 'CS-002', items: 'Delivery Kit #5', dept: 'Obstetrics', loadedAt: '06:30', status: 'in_process', cycle: 'Autoclave 121°C', indicator: 'pending' },
    { id: 'CS-003', items: 'Ortho Implant Tray #3', dept: 'Orthopedics OT', loadedAt: '07:00', status: 'cooling', cycle: 'ETO', indicator: 'pending' },
    { id: 'CS-004', items: 'Dressing Set x20', dept: 'Ward A', loadedAt: '05:30', status: 'dispatched', cycle: 'Autoclave 134°C', indicator: 'pass' },
    { id: 'CS-005', items: 'Endoscopy Accessories', dept: 'Day Care', loadedAt: '07:30', status: 'washing', cycle: 'Low-Temp Plasma', indicator: 'pending' },
  ];

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    washing: { label: 'Washing', variant: 'outline' },
    in_process: { label: 'Sterilizing', variant: 'secondary' },
    cooling: { label: 'Cooling', variant: 'secondary' },
    sterilized: { label: 'Sterilized', variant: 'default' },
    dispatched: { label: 'Dispatched', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
  };

  const stats = {
    total: batches.length,
    ready: batches.filter(b => b.status === 'sterilized').length,
    processing: batches.filter(b => ['washing', 'in_process', 'cooling'].includes(b.status)).length,
    dispatched: batches.filter(b => b.status === 'dispatched').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">CSSD (Central Sterile Supply)</h3>
          <p className="text-sm text-muted-foreground">Sterilization tracking, batch processing & dispatch</p>
        </div>
        <Button size="sm" className="gap-2"><Package className="h-4 w-4" /> New Batch</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Today's Batches</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <RotateCcw className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
          <p className="text-xs text-muted-foreground">Processing</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
          <p className="text-xs text-muted-foreground">Ready</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Shield className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.dispatched}</p>
          <p className="text-xs text-muted-foreground">Dispatched</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {batches.map(b => (
          <Card key={b.id}>
            <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{b.items}</span>
                  <Badge variant={statusConfig[b.status]?.variant} className="text-[10px]">{statusConfig[b.status]?.label}</Badge>
                  {b.indicator === 'pass' && <Badge variant="default" className="text-[10px] bg-emerald-500">BI Pass</Badge>}
                  {b.indicator === 'pending' && <Badge variant="outline" className="text-[10px]">BI Pending</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b.id} • For: {b.dept} • Loaded: {b.loadedAt} • {b.cycle}</p>
              </div>
              <div className="flex gap-1">
                {b.status === 'sterilized' && <Button size="sm" className="text-xs">Dispatch</Button>}
                {b.status === 'cooling' && <Button size="sm" variant="outline" className="text-xs">Check BI</Button>}
                <Button size="sm" variant="outline" className="text-xs">Track</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
