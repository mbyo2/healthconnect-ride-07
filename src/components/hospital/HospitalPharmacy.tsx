import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Pill, Search, AlertTriangle, Package, TrendingDown, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const HospitalPharmacy = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [showAddRx, setShowAddRx] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [drugForm, setDrugForm] = useState({
    product_name: '',
    category: 'Analgesics',
    quantity: 100,
    unit_price: 10,
    batch_number: '',
    expiry_date: '',
    reorder_level: 20,
  });

  const [rxForm, setRxForm] = useState({
    patient_name: '',
    medication_name: '',
    dosage: '',
    quantity: 1,
    instructions: '',
  });

  const { data: inventory, loading, error, refresh } = useHospitalModule<any>(
    'pharmacy_inventory', 'pharmacy_id', hospital?.id, { orderBy: 'product_name', ascending: true }
  );
  const { data: prescriptions, loading: rxLoading, refresh: refreshRx } = useHospitalModule<any>(
    'comprehensive_prescriptions', 'pharmacy_id', hospital?.id, { orderBy: 'prescribed_date', ascending: false }
  );
  const { nameFor } = usePatientNames(prescriptions.map(p => p.patient_id));

  const lowStock = inventory.filter(i => (i.quantity ?? 0) <= (i.reorder_level ?? 0));
  const nearExpiry = inventory.filter(
    i => i.expiry_date && new Date(i.expiry_date).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000
  );
  const pendingRx = prescriptions.filter(p => ['active', 'pending', 'dispensing'].includes(p.status));

  const handleAddDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugForm.product_name) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from('pharmacy_inventory' as any) as any).insert({
        pharmacy_id: hospital.id,
        ...drugForm,
        quantity: Number(drugForm.quantity),
        unit_price: Number(drugForm.unit_price),
        reorder_level: Number(drugForm.reorder_level),
      });
      if (err) throw err;
      toast.success('Drug added to pharmacy inventory');
      setShowAddDrug(false);
      setDrugForm({ product_name: '', category: 'Analgesics', quantity: 100, unit_price: 10, batch_number: '', expiry_date: '', reorder_level: 20 });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add drug');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxForm.medication_name) return;
    setIsSubmitting(true);
    try {
      const { error: err } = await (supabase.from('comprehensive_prescriptions' as any) as any).insert({
        pharmacy_id: hospital.id,
        medication_name: rxForm.medication_name,
        dosage: rxForm.dosage || '1 tablet daily',
        quantity: Number(rxForm.quantity),
        instructions: rxForm.instructions || 'Take as directed',
        status: 'pending',
        prescribed_date: new Date().toISOString().split('T')[0],
      });
      if (err) throw err;
      toast.success('Prescription created for pharmacy fulfillment');
      setShowAddRx(false);
      setRxForm({ patient_name: '', medication_name: '', dosage: '', quantity: 1, instructions: '' });
      refreshRx();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispense = async (rx: any, status: string) => {
    try {
      const { error: err } = await (supabase.from('comprehensive_prescriptions' as any) as any)
        .update({ status }).eq('id', rx.id);
      if (err) throw err;
      toast.success(`${rx.medication_name} → ${status}`);
      refreshRx();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update prescription');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">In-Hospital Pharmacy</h3>
          <p className="text-sm text-muted-foreground">Dispensing, stock management & prescription processing</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { refresh(); refreshRx(); }}>Refresh</Button>
          <Button size="sm" variant="outline" onClick={() => setShowAddDrug(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Drug
          </Button>
          <Button size="sm" onClick={() => setShowAddRx(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Prescription
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
          <p className="text-xs text-muted-foreground">Stock Items</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Low Stock</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{nearExpiry.length}</p>
          <p className="text-xs text-muted-foreground">Near Expiry</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Pill className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{pendingRx.length}</p>
          <p className="text-xs text-muted-foreground">Open Prescriptions</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="text-xs">Prescriptions ({pendingRx.length})</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Drug Inventory ({inventory.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3 pt-3">
          {rxLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : pendingRx.length === 0 ? (
            <EmptyState 
              icon={Pill} 
              title="No prescriptions to dispense" 
              description="Prescriptions created here or routed to this pharmacy appear here."
              actionLabel="Write Prescription"
              onAction={() => setShowAddRx(true)}
            />
          ) : (
            pendingRx.map(rx => (
              <Card key={rx.id}>
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{nameFor(rx.patient_id) || rx.patient_name || 'Hospital Patient'}</p>
                    <p className="text-xs text-muted-foreground">
                      {rx.medication_name} {rx.strength || rx.dosage || ''} • Qty {rx.quantity ?? '1'}
                    </p>
                    {rx.instructions && <p className="text-xs text-muted-foreground">{rx.instructions}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">{rx.status}</Badge>
                    <Button size="sm" className="gap-1 text-xs" onClick={() => dispense(rx, 'completed')}>
                      <CheckCircle2 className="h-3 w-3" /> Dispense
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          {loading ? (
            <ListSkeleton count={5} variant="compact" />
          ) : error ? (
            <EmptyState icon={Pill} title="Could not load pharmacy stock" description={error} actionLabel="Retry" onAction={refresh} />
          ) : inventory.length === 0 ? (
            <EmptyState 
              icon={Pill} 
              title="No pharmacy stock recorded" 
              description="Add drugs to the pharmacy inventory to enable dispensing and alerts."
              actionLabel="Add First Drug"
              onAction={() => setShowAddDrug(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 text-xs">Drug</th><th className="p-2 text-xs">Category</th><th className="p-2 text-xs">Batch</th>
                  <th className="p-2 text-xs">Qty</th><th className="p-2 text-xs">Expiry</th><th className="p-2 text-xs">Status</th>
                </tr></thead>
                <tbody>
                  {inventory
                    .filter(i => (i.product_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(i => (
                      <tr key={i.id} className="border-b border-border">
                        <td className="p-2 font-medium text-foreground">{i.product_name}</td>
                        <td className="p-2 text-muted-foreground">{i.category || '—'}</td>
                        <td className="p-2 text-muted-foreground">{i.batch_number || '—'}</td>
                        <td className="p-2 text-foreground">{i.quantity ?? 0}</td>
                        <td className="p-2 text-muted-foreground">{i.expiry_date || '—'}</td>
                        <td className="p-2">
                          {(i.quantity ?? 0) <= (i.reorder_level ?? 0)
                            ? <Badge variant="destructive" className="text-[10px]">Low</Badge>
                            : i.expiry_date && new Date(i.expiry_date).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000
                              ? <Badge variant="secondary" className="text-[10px]">Near Expiry</Badge>
                              : <Badge variant="outline" className="text-[10px]">OK</Badge>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3 pt-3">
          {lowStock.length === 0 && nearExpiry.length === 0 && (
            <EmptyState icon={CheckCircle2} title="No stock alerts" description="Nothing is below reorder level or close to expiry." />
          )}
          {lowStock.map(i => (
            <Card key={i.id} className="border-amber-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.product_name} — Low Stock</p>
                  <p className="text-xs text-muted-foreground">Current: {i.quantity ?? 0} | Reorder level: {i.reorder_level ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {nearExpiry.map(i => (
            <Card key={`exp-${i.id}`} className="border-destructive/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.product_name} — Expiring Soon</p>
                  <p className="text-xs text-muted-foreground">Batch: {i.batch_number || '—'} | Expiry: {i.expiry_date} | Qty: {i.quantity ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Drug Dialog */}
      <Dialog open={showAddDrug} onOpenChange={setShowAddDrug}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Add Drug to Pharmacy</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDrug} className="space-y-3 py-2">
            <div>
              <Label htmlFor="product_name">Drug Name *</Label>
              <Input id="product_name" value={drugForm.product_name} onChange={e => setDrugForm({ ...drugForm, product_name: e.target.value })} placeholder="e.g. Amoxicillin 500mg" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={drugForm.category} onChange={e => setDrugForm({ ...drugForm, category: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="quantity">Stock Qty</Label>
                <Input id="quantity" type="number" value={drugForm.quantity} onChange={e => setDrugForm({ ...drugForm, quantity: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="unit_price">Unit Price</Label>
                <Input id="unit_price" type="number" value={drugForm.unit_price} onChange={e => setDrugForm({ ...drugForm, unit_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="reorder_level">Min Reorder Qty</Label>
                <Input id="reorder_level" type="number" value={drugForm.reorder_level} onChange={e => setDrugForm({ ...drugForm, reorder_level: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="batch_number">Batch Number</Label>
                <Input id="batch_number" value={drugForm.batch_number} onChange={e => setDrugForm({ ...drugForm, batch_number: e.target.value })} placeholder="e.g. BATCH-001" />
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input id="expiry_date" type="date" value={drugForm.expiry_date} onChange={e => setDrugForm({ ...drugForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDrug(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Add Drug</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Prescription Dialog */}
      <Dialog open={showAddRx} onOpenChange={setShowAddRx}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Write Hospital Prescription</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRx} className="space-y-3 py-2">
            <div>
              <Label>Medication Name *</Label>
              <Input value={rxForm.medication_name} onChange={e => setRxForm({ ...rxForm, medication_name: e.target.value })} placeholder="e.g. Paracetamol 500mg" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Dosage</Label>
                <Input value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} placeholder="e.g. 1 tab 3x daily" />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={rxForm.quantity} onChange={e => setRxForm({ ...rxForm, quantity: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Instructions</Label>
              <Input value={rxForm.instructions} onChange={e => setRxForm({ ...rxForm, instructions: e.target.value })} placeholder="Take after meals" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddRx(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Save Prescription</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
