import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, AlertTriangle } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const BloodBank = ({ hospital }: { hospital: any }) => {
  const { data: inventory, loading, error, refresh } = useHospitalModule<any>(
    'blood_bank_inventory', 'hospital_id', hospital?.id, { orderBy: 'blood_type', ascending: true }
  );
  const { data: requests, loading: reqLoading, refresh: refreshRequests } = useHospitalModule<any>(
    'blood_bank_requests', 'hospital_id', hospital?.id, { orderBy: 'request_date', ascending: false }
  );
  const { nameFor } = usePatientNames(requests.map(r => r.patient_id));

  // Aggregate live rows per blood type / component
  const byType = BLOOD_TYPES.map(type => {
    const rows = inventory.filter(i => i.blood_type === type);
    const unitsFor = (component: string) =>
      rows.filter(r => (r.component_type || '').toLowerCase() === component)
        .reduce((s, r) => s + (r.units_available || 0), 0);
    const total = rows.reduce((s, r) => s + (r.units_available || 0), 0);
    return {
      type,
      whole: unitsFor('whole_blood') || unitsFor('whole blood'),
      prbc: unitsFor('prbc'),
      ffp: unitsFor('ffp'),
      platelets: unitsFor('platelets'),
      total,
      status: total === 0 ? 'critical' : total < 5 ? 'low' : 'adequate',
      hasRows: rows.length > 0,
    };
  });

  const tracked = byType.filter(t => t.hasRows);
  const criticalCount = tracked.filter(t => t.status === 'critical').length;

  const updateRequest = async (row: any, status: string) => {
    try {
      const { error: err } = await (supabase.from('blood_bank_requests' as any) as any)
        .update({ status, ...(status === 'issued' ? { issued_date: new Date().toISOString() } : {}) })
        .eq('id', row.id);
      if (err) throw err;
      toast.success(`Request ${row.request_number || ''} ${status}`);
      refreshRequests();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update request');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Blood Bank Management</h3>
          <p className="text-sm text-muted-foreground">Live stock levels and transfusion requests</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { refresh(); refreshRequests(); }}>Refresh</Button>
      </div>

      {criticalCount > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {criticalCount} blood group(s) are out of stock.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-3 pt-3">
          {loading ? (
            <ListSkeleton count={4} variant="compact" />
          ) : error ? (
            <EmptyState icon={Droplets} title="Could not load blood stock" description={error} actionLabel="Retry" onAction={refresh} />
          ) : tracked.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="No blood stock recorded"
              description="Add units to your blood bank inventory to see live availability per component."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tracked.map(t => (
                <Card key={t.type}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-foreground">{t.type}</span>
                      <Badge
                        variant={t.status === 'adequate' ? 'default' : t.status === 'low' ? 'secondary' : 'destructive'}
                        className="text-[10px] capitalize"
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Whole: {t.whole}</p>
                      <p>PRBC: {t.prbc}</p>
                      <p>FFP: {t.ffp}</p>
                      <p>Platelets: {t.platelets}</p>
                      <p className="text-foreground font-medium pt-1">Total: {t.total} units</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3 pt-3">
          {reqLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : requests.length === 0 ? (
            <EmptyState icon={Droplets} title="No transfusion requests" description="Requests raised by wards and theatre appear here." />
          ) : (
            requests.map(r => (
              <Card key={r.id}>
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{nameFor(r.patient_id)}</span>
                      <Badge variant="outline" className="text-[10px]">{r.blood_type} • {r.component_type}</Badge>
                      <Badge variant={r.urgency === 'emergency' ? 'destructive' : 'secondary'} className="text-[10px] capitalize">{r.urgency}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.request_number} • {r.units_required} unit(s) • Status: {r.status}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {r.status !== 'issued' && (
                      <Button size="sm" className="text-xs" onClick={() => updateRequest(r, 'issued')}>Issue</Button>
                    )}
                    {r.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateRequest(r, 'crossmatch_done')}>Crossmatch</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
