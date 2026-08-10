import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Pill, Search, AlertTriangle, Package, TrendingDown, CheckCircle2,
  Plus, Loader2, ShieldAlert, DollarSign, ArrowUpRight, Percent,
  CreditCard, Smartphone, ShieldCheck, Trash2, Sparkles, RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { usePatientNames } from '@/hooks/usePatientNames';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DRUG_CATEGORIES = ['Analgesics', 'Antibiotics', 'Antivirals', 'Antihypertensives', 'Antidiabetics', 'Vitamins', 'Antipyretics', 'Antihistamines', 'IV Fluids', 'Controlled', 'Other'];

export const HospitalPharmacy = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDrug, setShowAddDrug] = useState(false);
  const [showAddRx, setShowAddRx] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posCart, setPosCart] = useState<any[]>([]);
  const [posPayment, setPosPayment] = useState<'cash' | 'card' | 'mobile_money' | 'insurance'>('cash');

  const [drugForm, setDrugForm] = useState({
    product_name: '',
    category: 'Analgesics',
    quantity: 100,
    unit_price: 10,
    cost_price: 6,
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

  const [writeOffForm, setWriteOffForm] = useState({
    item_id: '',
    quantity: 1,
    reason: 'expired',
    notes: ''
  });

  const { data: inventory, loading, error, refresh } = useHospitalModule<any>(
    'pharmacy_inventory', 'pharmacy_id', hospital?.id, { orderBy: 'product_name', ascending: true }
  );
  const { data: prescriptions, loading: rxLoading, refresh: refreshRx } = useHospitalModule<any>(
    'comprehensive_prescriptions', 'pharmacy_id', hospital?.id, { orderBy: 'prescribed_date', ascending: false }
  );
  const { nameFor } = usePatientNames(prescriptions.map(p => p.patient_id));

  // Computed stock metrics
  const lowStock = inventory.filter(i => (i.quantity ?? 0) <= (i.reorder_level ?? 20));
  const expiredItems = inventory.filter(i =>
    i.expiry_date && new Date(i.expiry_date).getTime() <= Date.now()
  );
  const nearExpiry = inventory.filter(i => {
    if (!i.expiry_date) return false;
    const diff = Math.floor((new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 30;
  });
  const pendingRx = prescriptions.filter(p => ['active', 'pending', 'dispensing'].includes(p.status));

  const totalRetailValue = inventory.reduce((s, i) => s + ((Number(i.unit_price) || 0) * (Number(i.quantity) || 0)), 0);
  const totalCostValue = inventory.reduce((s, i) => s + ((Number(i.cost_price || i.unit_price * 0.6) || 0) * (Number(i.quantity) || 0)), 0);
  const totalProfit = totalRetailValue - totalCostValue;
  const avgMarginPct = totalCostValue > 0 ? ((totalProfit / totalCostValue) * 100).toFixed(1) : '0';

  // POS Cart for hospital dispensing
  const addToPos = (item: any) => {
    setPosCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      if (ex) return prev.map(i => i.id === item.id ? { ...i, cartQty: i.cartQty + 1 } : i);
      return [...prev, { ...item, cartQty: 1 }];
    });
  };
  const posSubtotal = posCart.reduce((s, i) => s + i.unit_price * i.cartQty, 0);
  const posCostTotal = posCart.reduce((s, i) => s + (i.cost_price || i.unit_price * 0.6) * i.cartQty, 0);
  const posProfit = posSubtotal - posCostTotal;

  // Add drug handler
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
        cost_price: Number(drugForm.cost_price),
        reorder_level: Number(drugForm.reorder_level),
      });
      if (err) throw err;
      toast.success('Drug added to pharmacy inventory');
      setShowAddDrug(false);
      setDrugForm({ product_name: '', category: 'Analgesics', quantity: 100, unit_price: 10, cost_price: 6, batch_number: '', expiry_date: '', reorder_level: 20 });
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

  const handleWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === writeOffForm.item_id);
    if (!item) { toast.error('Select a product'); return; }
    if (writeOffForm.quantity <= 0 || writeOffForm.quantity > item.quantity) {
      toast.error(`Quantity must be 1–${item.quantity}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const newQty = Math.max(0, item.quantity - writeOffForm.quantity);
      const { error: invErr } = await supabase
        .from('pharmacy_inventory' as any)
        .update({ quantity: newQty })
        .eq('id', item.id);
      if (invErr) throw invErr;

      await (supabase.from('inventory_transactions' as any) as any).insert({
        medication_inventory_id: item.id,
        transaction_type: writeOffForm.reason === 'expired' ? 'expired' : 'damaged',
        quantity: writeOffForm.quantity,
        unit_price: item.cost_price || item.unit_price,
        notes: `Hospital Write-off (${writeOffForm.reason}): ${writeOffForm.notes}`,
        created_at: new Date().toISOString(),
      });

      toast.success(`Wrote off ${writeOffForm.quantity} × ${item.product_name}`);
      setShowWriteOff(false);
      setWriteOffForm({ item_id: '', quantity: 1, reason: 'expired', notes: '' });
      refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to write off');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(i =>
    (i.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 rounded-xl border border-primary/20">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" /> In-Hospital Pharmacy
          </h3>
          <p className="text-xs text-muted-foreground">Dispensing • Stock Management • Profit Margins • Damage Audit</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { refresh(); refreshRx(); }}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowAddDrug(true)}>
            <Plus className="h-3 w-3" /> Add Drug
          </Button>
          <Button size="sm" className="text-xs h-7 gap-1" onClick={() => setShowAddRx(true)}>
            <Plus className="h-3 w-3" /> New Prescription
          </Button>
          <Button size="sm" variant="destructive" className="text-xs h-7 gap-1" onClick={() => setShowWriteOff(true)}>
            <ShieldAlert className="h-3 w-3" /> Write-Off
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-bold text-foreground">{inventory.length}</p>
          <p className="text-[10px] text-muted-foreground">Stock Items</p>
        </CardContent></Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5"><CardContent className="pt-4 text-center">
          <ArrowUpRight className="h-5 w-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{avgMarginPct}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Profit Margin</p>
        </CardContent></Card>

        <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="pt-4 text-center">
          <TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-xl font-bold text-amber-500">{lowStock.length}</p>
          <p className="text-[10px] text-muted-foreground">Low Stock</p>
        </CardContent></Card>

        <Card className="border-destructive/20 bg-destructive/5"><CardContent className="pt-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-xl font-bold text-destructive">{expiredItems.length + nearExpiry.length}</p>
          <p className="text-[10px] text-muted-foreground">Expired/Near Expiry</p>
        </CardContent></Card>

        <Card><CardContent className="pt-4 text-center">
          <Pill className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-xl font-bold text-foreground">{pendingRx.length}</p>
          <p className="text-[10px] text-muted-foreground">Open Prescriptions</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="orders" className="text-xs h-7">Prescriptions ({pendingRx.length})</TabsTrigger>
          <TabsTrigger value="pos" className="text-xs h-7">POS Dispensing</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs h-7">Inventory & Margins ({inventory.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs h-7">Alerts & Audit</TabsTrigger>
        </TabsList>

        {/* Prescriptions Tab */}
        <TabsContent value="orders" className="space-y-3 pt-3">
          {rxLoading ? (
            <ListSkeleton count={3} variant="row" />
          ) : pendingRx.length === 0 ? (
            <EmptyState icon={Pill} title="No prescriptions to dispense" description="Prescriptions will appear here once routed." actionLabel="Write Prescription" onAction={() => setShowAddRx(true)} />
          ) : (
            pendingRx.map(rx => (
              <Card key={rx.id}>
                <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{nameFor(rx.patient_id) || rx.patient_name || 'Hospital Patient'}</p>
                    <p className="text-xs text-muted-foreground">{rx.medication_name} {rx.strength || rx.dosage || ''} • Qty {rx.quantity ?? '1'}</p>
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

        {/* POS Dispensing Tab */}
        <TabsContent value="pos" className="pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Select Products to Dispense</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {filteredInventory.filter(i => i.quantity > 0).map(item => {
                    const cost = Number(item.cost_price || item.unit_price * 0.6);
                    const price = Number(item.unit_price);
                    const marginPct = cost > 0 ? (((price - cost) / cost) * 100).toFixed(0) : '0';
                    return (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg cursor-pointer hover:border-primary hover:shadow-sm transition-all bg-card"
                        onClick={() => addToPos(item)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-xs text-foreground">{item.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.category} • Stock: {item.quantity}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-foreground">K{price}</span>
                              <Badge variant="outline" className="text-[9px] px-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                +{marginPct}%
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" className="h-7 w-7 p-0 rounded-full flex-shrink-0"><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader className="pb-2 border-b bg-muted/20">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 text-primary" /> Cart ({posCart.reduce((s, i) => s + i.cartQty, 0)})</span>
                  {posCart.length > 0 && <Button variant="ghost" size="sm" className="text-destructive h-6 text-xs" onClick={() => setPosCart([])}>Clear</Button>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-3">
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {posCart.length === 0 ? (
                    <p className="text-xs text-center text-muted-foreground py-6">Empty cart</p>
                  ) : (
                    posCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-xs border rounded p-2">
                        <div>
                          <p className="font-medium text-foreground">{item.product_name}</p>
                          <p className="text-muted-foreground text-[10px]">K{item.unit_price} × {item.cartQty} = <strong>K{(item.unit_price * item.cartQty).toFixed(2)}</strong></p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setPosCart(p => p.map(i => i.id === item.id ? { ...i, cartQty: Math.max(1, i.cartQty - 1) } : i))}>-</Button>
                          <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => setPosCart(p => p.map(i => i.id === item.id ? { ...i, cartQty: i.cartQty + 1 } : i))}>+</Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setPosCart(p => p.filter(i => i.id !== item.id))}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Payment method */}
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase">Payment</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['cash', 'mobile_money', 'card', 'insurance'] as const).map(m => (
                      <Button key={m} size="sm" type="button" variant={posPayment === m ? 'default' : 'outline'} className="text-[9px] h-6 px-1" onClick={() => setPosPayment(m)}>
                        {m === 'cash' ? 'Cash' : m === 'mobile_money' ? 'Mobile' : m === 'card' ? 'Card' : 'Insure'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>K{posSubtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Margin</span><span>+K{posProfit.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t"><span>Total</span><span className="text-primary">K{posSubtotal.toFixed(2)}</span></div>
                </div>

                <Button
                  className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={posCart.length === 0}
                  onClick={async () => {
                    for (const item of posCart) {
                      const newQty = Math.max(0, item.quantity - item.cartQty);
                      await supabase.from('pharmacy_inventory' as any).update({ quantity: newQty }).eq('id', item.id);
                    }
                    toast.success('Dispensing complete & stock updated');
                    setPosCart([]);
                    refresh();
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm Dispensing
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory & Margins Tab */}
        <TabsContent value="inventory" className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 text-xs h-9" />
          </div>
          {loading ? (
            <ListSkeleton count={5} variant="compact" />
          ) : inventory.length === 0 ? (
            <EmptyState icon={Pill} title="No pharmacy stock" description="Add drugs to enable dispensing and margin tracking." actionLabel="Add First Drug" onAction={() => setShowAddDrug(true)} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground font-semibold">
                    <th className="p-2">Drug Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Batch</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Cost Price</th>
                    <th className="p-2">Sell Price</th>
                    <th className="p-2">Margin</th>
                    <th className="p-2">Expiry</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInventory.map(i => {
                    const cost = Number(i.cost_price || i.unit_price * 0.6);
                    const price = Number(i.unit_price);
                    const margin = price - cost;
                    const marginPct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '0';
                    const isExpired = i.expiry_date && new Date(i.expiry_date).getTime() <= Date.now();
                    return (
                      <tr key={i.id} className="hover:bg-muted/20">
                        <td className="p-2 font-medium text-foreground">{i.product_name}</td>
                        <td className="p-2 text-muted-foreground">{i.category || '—'}</td>
                        <td className="p-2 text-muted-foreground">{i.batch_number || '—'}</td>
                        <td className="p-2 font-bold text-foreground">{i.quantity ?? 0}</td>
                        <td className="p-2 text-muted-foreground">K{cost.toFixed(2)}</td>
                        <td className="p-2 font-semibold text-foreground">K{price.toFixed(2)}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            +{marginPct}%
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{i.expiry_date || '—'}</td>
                        <td className="p-2">
                          {isExpired ? (
                            <Badge variant="destructive" className="text-[9px]">Expired</Badge>
                          ) : (i.quantity ?? 0) <= (i.reorder_level ?? 20) ? (
                            <Badge variant="destructive" className="text-[9px]">Low</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px]">OK</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Alerts & Audit Tab */}
        <TabsContent value="alerts" className="space-y-3 pt-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-foreground">Stock Alerts & Damage Audit</h4>
            <Button size="sm" variant="destructive" className="text-xs h-7 gap-1" onClick={() => setShowWriteOff(true)}>
              <ShieldAlert className="h-3 w-3" /> Log Write-Off
            </Button>
          </div>

          {lowStock.length === 0 && nearExpiry.length === 0 && expiredItems.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All clear!" description="No stock alerts, no expired or near-expiry items." />
          ) : null}

          {expiredItems.map(i => (
            <Card key={`exp-${i.id}`} className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{i.product_name} — EXPIRED</p>
                  <p className="text-xs text-muted-foreground">Expiry: {i.expiry_date} • Qty: {i.quantity} • Batch: {i.batch_number || '—'}</p>
                </div>
                <Badge variant="destructive">Action Needed</Badge>
              </CardContent>
            </Card>
          ))}

          {nearExpiry.map(i => (
            <Card key={`near-${i.id}`} className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{i.product_name} — Expiring Soon</p>
                  <p className="text-xs text-muted-foreground">Expiry: {i.expiry_date} • Qty: {i.quantity} • Batch: {i.batch_number || '—'}</p>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-500/30">Near Expiry</Badge>
              </CardContent>
            </Card>
          ))}

          {lowStock.map(i => (
            <Card key={i.id} className="border-amber-500/30">
              <CardContent className="pt-3 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.product_name} — Low Stock</p>
                  <p className="text-xs text-muted-foreground">Current: {i.quantity ?? 0} | Reorder Level: {i.reorder_level ?? 20}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Drug Dialog */}
      <Dialog open={showAddDrug} onOpenChange={setShowAddDrug}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader><DialogTitle>Add Drug to Hospital Pharmacy</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDrug} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Drug Name *</Label>
              <Input value={drugForm.product_name} onChange={e => setDrugForm({ ...drugForm, product_name: e.target.value })} placeholder="e.g. Amoxicillin 500mg" required className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={drugForm.category} onValueChange={v => setDrugForm({ ...drugForm, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{DRUG_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Stock Quantity</Label>
                <Input type="number" value={drugForm.quantity} onChange={e => setDrugForm({ ...drugForm, quantity: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Cost Price (K)</Label>
                <Input type="number" value={drugForm.cost_price} onChange={e => setDrugForm({ ...drugForm, cost_price: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Selling Price (K)</Label>
                <Input type="number" value={drugForm.unit_price} onChange={e => setDrugForm({ ...drugForm, unit_price: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Reorder Level</Label>
                <Input type="number" value={drugForm.reorder_level} onChange={e => setDrugForm({ ...drugForm, reorder_level: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Batch Number</Label>
                <Input value={drugForm.batch_number} onChange={e => setDrugForm({ ...drugForm, batch_number: e.target.value })} placeholder="BATCH-001" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Expiry Date</Label>
                <Input type="date" value={drugForm.expiry_date} onChange={e => setDrugForm({ ...drugForm, expiry_date: e.target.value })} className="h-8 text-xs" />
              </div>
            </div>
            {drugForm.unit_price > 0 && drugForm.cost_price > 0 && (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-600 dark:text-emerald-400 text-[11px]">
                Profit Margin: +K{(drugForm.unit_price - drugForm.cost_price).toFixed(2)} ({(((drugForm.unit_price - drugForm.cost_price) / drugForm.cost_price) * 100).toFixed(1)}%)
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddDrug(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Add Drug
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Write Prescription Dialog */}
      <Dialog open={showAddRx} onOpenChange={setShowAddRx}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Write Hospital Prescription</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateRx} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Medication Name *</Label>
              <Input value={rxForm.medication_name} onChange={e => setRxForm({ ...rxForm, medication_name: e.target.value })} placeholder="e.g. Paracetamol 500mg" required className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Dosage</Label>
                <Input value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} placeholder="1 tab 3x daily" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input type="number" value={rxForm.quantity} onChange={e => setRxForm({ ...rxForm, quantity: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Instructions</Label>
              <Input value={rxForm.instructions} onChange={e => setRxForm({ ...rxForm, instructions: e.target.value })} placeholder="Take after meals" className="h-8 text-xs" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddRx(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Save Prescription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Write-Off / Damage Dialog */}
      <Dialog open={showWriteOff} onOpenChange={setShowWriteOff}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Log Stock Write-Off / Damage
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWriteOff} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-medium">Select Product *</Label>
              <Select value={writeOffForm.item_id} onValueChange={v => setWriteOffForm({ ...writeOffForm, item_id: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose product..." /></SelectTrigger>
                <SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.product_name} (Qty: {i.quantity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Qty to Write Off *</Label>
                <Input type="number" value={writeOffForm.quantity} onChange={e => setWriteOffForm({ ...writeOffForm, quantity: Number(e.target.value) })} min={1} className="h-8 text-xs" required />
              </div>
              <div>
                <Label className="text-xs font-medium">Reason *</Label>
                <Select value={writeOffForm.reason} onValueChange={v => setWriteOffForm({ ...writeOffForm, reason: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expired">Expired Stock</SelectItem>
                    <SelectItem value="damaged">Damaged in Transit</SelectItem>
                    <SelectItem value="broken">Broken Vial/Bottle</SelectItem>
                    <SelectItem value="temperature">Temp Storage Failure</SelectItem>
                    <SelectItem value="stolen">Stolen / Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Audit Notes</Label>
              <Textarea value={writeOffForm.notes} onChange={e => setWriteOffForm({ ...writeOffForm, notes: e.target.value })} placeholder="Details about damage, disposal method, supervisor name..." rows={2} className="text-xs" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowWriteOff(false)}>Cancel</Button>
              <Button type="submit" size="sm" variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Confirm Write-Off
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
