import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Package, CheckCircle2, RotateCcw } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  dirty: { label: 'Awaiting Wash', variant: 'outline' },
  washing: { label: 'Washing', variant: 'outline' },
  in_process: { label: 'Sterilizing', variant: 'secondary' },
  cooling: { label: 'Cooling', variant: 'secondary' },
  sterilized: { label: 'Sterilized', variant: 'default' },
  dispatched: { label: 'Dispatched', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export const CSSDManagement = ({ hospital }: { hospital: any }) => {
  const { data: items, loading, error, refresh } = useHospitalModule<any>(
    'cssd_items', 'hospital_id', hospital?.id, { orderBy: 'updated_at', ascending: false }
  );

  const stats = {
    total: items.length,
    processing: items.filter(i => ['washing', 'in_process', 'cooling'].includes(i.sterilization_status)).length,
    ready: items.filter(i => i.sterilization_status === 'sterilized').length,
    dispatched: items.filter(i => i.sterilization_status === 'dispatched').length,
  };

  const setStatus = async (row: any, status: string) => {
    try {
      const patch: any = { sterilization_status: status };
      if (status === 'sterilized') patch.last_sterilization_date = new Date().toISOString();
      const { error: err } = await (supabase.from('cssd_items' as any) as any).update(patch).eq('id', row.id);
      if (err) throw err;
      toast.success(`${row.item_name} → ${statusConfig[status]?.label || status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update item');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">CSSD (Central Sterile Supply)</h3>
          <p className="text-sm text-muted-foreground">Sterilization tracking, batch processing & dispatch</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Tracked Items</p>
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

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Package} title="Could not load CSSD items" description={error} actionLabel="Retry" onAction={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="No CSSD items registered" description="Register instrument sets and trays to track sterilization cycles." />
      ) : (
        <div className="space-y-3">
          {items.map(i => (
            <Card key={i.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{i.item_name}</span>
                    <Badge variant={statusConfig[i.sterilization_status]?.variant || 'outline'} className="text-[10px]">
                      {statusConfig[i.sterilization_status]?.label || i.sterilization_status || 'Unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {i.item_code || i.id.slice(0, 8)} • {i.item_type || 'Instrument'} • Available {i.available_quantity ?? 0}/{i.total_quantity ?? 0}
                    {i.next_sterilization_date ? ` • Next cycle ${new Date(i.next_sterilization_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  {i.sterilization_status !== 'sterilized' && (
                    <Button size="sm" className="text-xs" onClick={() => setStatus(i, 'sterilized')}>Mark Sterilized</Button>
                  )}
                  {i.sterilization_status === 'sterilized' && (
                    <Button size="sm" className="text-xs" onClick={() => setStatus(i, 'dispatched')}>Dispatch</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
