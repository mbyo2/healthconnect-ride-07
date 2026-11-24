import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Package, CheckCircle2, RotateCcw, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { friendlyErrorMessage } from '@/utils/friendly-error';
import { fetchDepartments, type HospitalDepartment } from '@/services/hospitalStockService';

/**
 * Live schema vocabulary (verified against the database CHECK constraints —
 * do not invent values):
 *   cssd_items.sterilization_status ∈ sterile | contaminated | in_process | expired
 *   cssd_items.item_type            ∈ instrument | linen | consumable | equipment
 *   cssd_transactions.transaction_type ∈ issue | return | sterilize | dispose | add
 */
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  contaminated: { label: 'Awaiting Processing', variant: 'outline' },
  in_process: { label: 'Sterilizing', variant: 'secondary' },
  sterile: { label: 'Sterile — Ready', variant: 'default' },
  expired: { label: 'Expired', variant: 'destructive' },
};

const itemTypeOptions = [
  { value: 'instrument', label: 'Instrument' },
  { value: 'linen', label: 'Linen' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'equipment', label: 'Equipment' },
];

const NO_DEPARTMENT = '__none__';

export const CSSDManagement = ({ hospital }: { hospital: any }) => {
  const { data: items, loading, error, refresh } = useHospitalModule<any>(
    'cssd_items', 'hospital_id', hospital?.id, { orderBy: 'updated_at', ascending: false }
  );
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ item_name: '', item_code: '', item_type: 'instrument', department_id: '', total_quantity: 1, available_quantity: 1 });

  useEffect(() => {
    if (!hospital?.id) return;
    let cancelled = false;
    fetchDepartments(hospital.id)
      .then(rows => { if (!cancelled) setDepartments(rows); })
      .catch(() => { if (!cancelled) setDepartments([]); });
    return () => { cancelled = true; };
  }, [hospital?.id]);

  const stats = {
    total: items.length,
    processing: items.filter(i => i.sterilization_status === 'in_process').length,
    ready: items.filter(i => i.sterilization_status === 'sterile').length,
    inUse: items.reduce((sum, i) => sum + (i.in_use_quantity ?? 0), 0),
  };

  /** Append the cssd_transactions ledger row for an action. */
  const recordTransaction = async (row: any, transactionType: string, quantity: number) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error: txError } = await (supabase.from('cssd_transactions' as any) as any).insert({
      hospital_id: hospital?.id ?? row.hospital_id,
      item_id: row.id,
      transaction_type: transactionType,
      quantity,
      department_id: row.department_id || null,
      performed_by: auth.user?.id ?? null,
    });
    if (txError) throw txError;
  };

  /** Apply a patch to an item, then write its ledger row; if the ledger write
   *  fails after the item saved, say so plainly instead of hiding it. */
  const applyChange = async (row: any, patch: any, transactionType: string, quantity: number, successLabel: string) => {
    try {
      const { error: err } = await (supabase.from('cssd_items' as any) as any).update(patch).eq('id', row.id);
      if (err) throw err;
      try {
        await recordTransaction(row, transactionType, quantity);
      } catch (txErr: any) {
        toast.error(friendlyErrorMessage(txErr, `The change was saved, but the movement record could not be saved. Please tell your administrator.`));
        refresh();
        return;
      }
      toast.success(`${row.item_name} → ${successLabel}`);
      refresh();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, 'Failed to update item'));
    }
  };

  const setStatus = (row: any, status: string) => {
    const patch: any = { sterilization_status: status };
    if (status === 'sterile') patch.last_sterilization_date = new Date().toISOString();
    return applyChange(row, patch, 'sterilize', row.available_quantity ?? row.total_quantity ?? 1,
      statusConfig[status]?.label || status);
  };

  const issueItem = (row: any) => {
    const available = row.available_quantity ?? 0;
    if (available <= 0) { toast.error('None of this item is available to issue right now.'); return; }
    return applyChange(row,
      { available_quantity: available - 1, in_use_quantity: (row.in_use_quantity ?? 0) + 1 },
      'issue', 1, 'Issued');
  };

  const returnItem = (row: any) => {
    const inUse = row.in_use_quantity ?? 0;
    if (inUse <= 0) { toast.error('This item has no units out on issue to return.'); return; }
    return applyChange(row,
      { available_quantity: (row.available_quantity ?? 0) + 1, in_use_quantity: inUse - 1, sterilization_status: 'contaminated' },
      'return', 1, 'Returned — awaiting processing');
  };

  const disposeItem = (row: any) => {
    const qty = (row.available_quantity ?? 0) + (row.in_use_quantity ?? 0);
    return applyChange(row, { available_quantity: 0, in_use_quantity: 0 }, 'dispose', qty, 'Disposed');
  };

  const createItem = async () => {
    if (!hospital?.id) { toast.error('No facility is linked to this account yet.'); return; }
    if (!form.item_name.trim()) { toast.error('Give the item a name — for example "Major instrument set".'); return; }
    const total = Math.max(0, Math.floor(Number(form.total_quantity) || 0));
    const available = Math.min(total, Math.max(0, Math.floor(Number(form.available_quantity) || 0)));
    setCreating(true);
    try {
      const { data: created, error: err } = await (supabase.from('cssd_items' as any) as any)
        .insert({
          hospital_id: hospital.id,
          item_name: form.item_name.trim(),
          item_code: form.item_code.trim() || null,
          item_type: form.item_type,
          department_id: form.department_id || null,
          total_quantity: total,
          available_quantity: available,
          in_use_quantity: 0,
          sterilization_status: 'contaminated',
        })
        .select()
        .single();
      if (err) throw err;
      // Registration is the item's first ledger entry.
      try { await recordTransaction(created, 'add', total); } catch { /* trail starts at first action if this insert is refused */ }
      toast.success(`${form.item_name.trim()} registered in CSSD`);
      setForm({ item_name: '', item_code: '', item_type: 'instrument', department_id: '', total_quantity: 1, available_quantity: 1 });
      setShowCreate(false);
      refresh();
    } catch (e: any) {
      toast.error(friendlyErrorMessage(e, 'That item could not be registered. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">CSSD (Central Sterile Supply)</h3>
          <p className="text-sm text-muted-foreground">Sterilization tracking, batch processing & dispatch</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} className="min-h-[40px]">Refresh</Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="min-h-[40px] gap-1 bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]"><Plus className="h-4 w-4" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Register CSSD Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Item name</Label><Input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} placeholder="Major instrument set" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Item code</Label><Input value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value})} placeholder="CSSD-001" /></div>
                  <div className="space-y-1"><Label>Item type</Label>
                    <Select value={form.item_type} onValueChange={v => setForm({...form, item_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {itemTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label>Department</Label>
                  <Select value={form.department_id || NO_DEPARTMENT} onValueChange={v => setForm({...form, department_id: v === NO_DEPARTMENT ? '' : v})}>
                    <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_DEPARTMENT}>No department set</SelectItem>
                      {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments are set up for this facility yet — the item can still be registered without one.</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Total quantity</Label><Input type="number" min={0} value={form.total_quantity} onChange={e => setForm({...form, total_quantity: +e.target.value})} /></div>
                  <div className="space-y-1"><Label>Available quantity</Label><Input type="number" min={0} value={form.available_quantity} onChange={e => setForm({...form, available_quantity: +e.target.value})} /></div>
                </div>
                <p className="text-xs text-muted-foreground">New items start as "Awaiting Processing". Every later action is recorded in the CSSD movement history.</p>
                <Button className="w-full min-h-[44px] bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]" disabled={creating} onClick={createItem}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
          <p className="text-2xl font-bold text-foreground">{stats.inUse}</p>
          <p className="text-xs text-muted-foreground">Units In Use</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <ListSkeleton count={4} variant="row" />
      ) : error ? (
        <EmptyState icon={Package} title="Could not load CSSD items" description={error} actionLabel="Retry" onAction={refresh} />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="No CSSD items registered" description="Register instrument sets and trays to track sterilization cycles." actionLabel="Register Item" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3">
          {items.map(i => (
            <Card key={i.id}>
              <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{i.item_name}</span>
                    <Badge variant={statusConfig[i.sterilization_status]?.variant || 'outline'} className="text-xs">
                      {statusConfig[i.sterilization_status]?.label || i.sterilization_status || 'Unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {i.item_code || i.id.slice(0, 8)} • {itemTypeOptions.find(o => o.value === i.item_type)?.label || 'Instrument'} • Available {i.available_quantity ?? 0}/{i.total_quantity ?? 0}
                    {departments.find(d => d.id === i.department_id) ? ` • ${departments.find(d => d.id === i.department_id)?.name}` : ''}
                    {i.next_sterilization_date ? ` • Next cycle ${new Date(i.next_sterilization_date).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {i.sterilization_status === 'contaminated' && (
                    <Button size="sm" variant="outline" className="text-xs min-h-[36px]" onClick={() => setStatus(i, 'in_process')}>Start Sterilizing</Button>
                  )}
                  {i.sterilization_status === 'in_process' && (
                    <Button size="sm" className="text-xs min-h-[36px]" onClick={() => setStatus(i, 'sterile')}>Mark Sterile</Button>
                  )}
                  {i.sterilization_status === 'sterile' && (i.available_quantity ?? 0) > 0 && (
                    <Button size="sm" className="text-xs min-h-[36px]" onClick={() => issueItem(i)}>Issue</Button>
                  )}
                  {(i.in_use_quantity ?? 0) > 0 && (
                    <Button size="sm" variant="outline" className="text-xs min-h-[36px]" onClick={() => returnItem(i)}>Record Return</Button>
                  )}
                  {i.sterilization_status === 'expired' && (
                    <Button size="sm" variant="outline" className="text-xs min-h-[36px]" onClick={() => disposeItem(i)}>Dispose</Button>
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
