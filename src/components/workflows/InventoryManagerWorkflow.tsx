import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingDown, Plus, Loader2, Search, ArrowDownUp, History } from 'lucide-react';
import { useHospitalInventory, type HospitalInventoryItem, type HospitalMovementType } from '@/hooks/useHospitalInventory';
import { HOSPITAL_MOVEMENT_LABELS, type HospitalInventoryMovement } from '@/services/hospitalStockService';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

type MovementAction = 'received' | 'issued' | 'transferred' | 'adjusted' | 'written_off';

const ACTION_META: Record<MovementAction, { label: string; hint: string }> = {
  received: { label: 'Receive', hint: 'Goods received into stock — quantity goes up.' },
  issued: { label: 'Issue', hint: 'Stock issued out for use — quantity goes down.' },
  transferred: { label: 'Transfer', hint: 'Move this item to another department. The full stock on hand relocates.' },
  adjusted: { label: 'Adjust', hint: 'Stocktake correction — enter a signed amount: +2 adds stock, -3 removes it.' },
  written_off: { label: 'Write off', hint: 'Remove unusable stock (expired, damaged or written off) — quantity goes down.' },
};

const NO_DEPARTMENT = '__none__';

export const InventoryManagerWorkflow = () => {
  const {
    items, loading, lowStock, expiringSoon, addItem, updateItem,
    departments, departmentNameFor,
    movements, movementsLoading, fetchMovementHistory,
    receiveItem, issueItem, transferItem, adjustItem, writeOffItem,
  } = useHospitalInventory();
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'stock' | 'history'>('stock');
  const [form, setForm] = useState({ item_name: '', category: 'consumable', quantity_available: 0, reorder_level: 10, unit: 'pcs', unit_cost: 0, supplier: '', barcode: '', department_id: '', expiry_date: '' });

  // Edit dialog (department-aware)
  const [editItem, setEditItem] = useState<HospitalInventoryItem | null>(null);
  const [editDepartmentId, setEditDepartmentId] = useState('');

  // Movement dialog
  const [moveItem, setMoveItem] = useState<HospitalInventoryItem | null>(null);
  const [moveAction, setMoveAction] = useState<MovementAction>('received');
  const [moveForm, setMoveForm] = useState({ quantity: 1, reason: '', reference: '', toDepartmentId: '', writeOffKind: 'written_off' as 'written_off' | 'expired' | 'damaged' });
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Per-item history dialog
  const [historyItem, setHistoryItem] = useState<HospitalInventoryItem | null>(null);
  const [itemMovements, setItemMovements] = useState<HospitalInventoryMovement[]>([]);
  const [itemMovementsLoading, setItemMovementsLoading] = useState(false);

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.barcode || '').includes(search)
  );

  const itemNameById = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => map.set(i.id, i.item_name));
    return map;
  }, [items]);

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const handleScan = (code: string) => {
    setSearch(code);
    setShowScanner(false);
  };

  const openMovement = (item: HospitalInventoryItem, action: MovementAction) => {
    setMoveItem(item);
    setMoveAction(action);
    setMoveForm({ quantity: 1, reason: '', reference: '', toDepartmentId: '', writeOffKind: 'written_off' });
    setMoveError(null);
  };

  const submitMovement = async () => {
    if (!moveItem) return;
    const qty = Number(moveForm.quantity);
    if (moveAction === 'adjusted') {
      if (!qty) { setMoveError('Enter the adjustment amount — a positive number to add stock, or a negative number to remove it.'); return; }
    } else if (!qty || qty <= 0) {
      setMoveError('Enter a quantity greater than zero.'); return;
    }
    if ((moveAction === 'issued' || moveAction === 'transferred' || moveAction === 'written_off') && qty > moveItem.quantity_available) {
      setMoveError(`There isn't enough stock for that — only ${moveItem.quantity_available} ${moveItem.unit} on hand. Lower the quantity and try again.`);
      return;
    }
    if (moveAction === 'transferred' && !moveForm.toDepartmentId) {
      setMoveError('Choose the department this stock is moving to.'); return;
    }
    setMoveBusy(true);
    setMoveError(null);
    const opts = { reason: moveForm.reason || undefined, reference: moveForm.reference || undefined, toDepartmentId: moveForm.toDepartmentId || undefined };
    let ok = false;
    if (moveAction === 'received') ok = await receiveItem(moveItem.id, qty, opts);
    else if (moveAction === 'issued') ok = await issueItem(moveItem.id, qty, opts);
    else if (moveAction === 'transferred') ok = await transferItem(moveItem.id, qty, opts);
    else if (moveAction === 'adjusted') ok = await adjustItem(moveItem.id, qty, opts);
    else ok = await writeOffItem(moveItem.id, qty, { ...opts, kind: moveForm.writeOffKind });
    setMoveBusy(false);
    if (ok) setMoveItem(null);
    else setMoveError('That movement could not be recorded. Check the quantity — if the stock on hand has changed, refresh and try again.');
  };

  const openItemHistory = async (item: HospitalInventoryItem) => {
    setHistoryItem(item);
    setItemMovementsLoading(true);
    setItemMovements(await fetchMovementHistory(item.id));
    setItemMovementsLoading(false);
  };

  const renderMovementRows = (rows: HospitalInventoryMovement[]) => (
    <div className="divide-y divide-border">
      {rows.map(m => (
        <div key={m.id} className="py-2.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {HOSPITAL_MOVEMENT_LABELS[m.movement_type] || m.movement_type}
              {historyItem ? '' : ` — ${itemNameById.get(m.item_id) || 'Item'}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(m.created_at).toLocaleString()}
              {m.reason ? ` • ${m.reason}` : ''}
              {m.reference ? ` • Ref ${m.reference}` : ''}
              {m.to_department_id ? ` • To ${departmentNameById.get(m.to_department_id) || 'department'}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-foreground">{m.quantity} </p>
            {m.quantity_before != null && m.quantity_after != null && (
              <p className="text-xs text-muted-foreground">{m.quantity_before} → {m.quantity_after}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const departmentPicker = (value: string, onChange: (v: string) => void, label = 'Department (stock location)') => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value || NO_DEPARTMENT} onValueChange={v => onChange(v === NO_DEPARTMENT ? '' : v)}>
        <SelectTrigger><SelectValue placeholder="Choose a department" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_DEPARTMENT}>No department set</SelectItem>
          {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}{d.code ? ` (${d.code})` : ''}</SelectItem>)}
        </SelectContent>
      </Select>
      {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments are set up for this facility yet — items can still be added without one.</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Hospital-wide stock: consumables, surgical, PPE, equipment & more</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScanner(!showScanner)} className="gap-1 min-h-[44px]"><Search className="h-4 w-4" /> Scan</Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button className="gap-1 min-h-[44px] bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]"><Plus className="h-4 w-4" /> Add Item</Button></DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Item Name</Label><Input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consumable">Consumable</SelectItem><SelectItem value="surgical">Surgical</SelectItem>
                        <SelectItem value="pharmaceutical">Pharmaceutical</SelectItem><SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="linen">Linen</SelectItem><SelectItem value="ppe">PPE</SelectItem>
                        <SelectItem value="biomedical">Biomedical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {departmentPicker(form.department_id, v => setForm({...form, department_id: v}))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label>Qty</Label><Input type="number" value={form.quantity_available} onChange={e => setForm({...form, quantity_available: +e.target.value})} /></div>
                  <div className="space-y-1"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={e => setForm({...form, reorder_level: +e.target.value})} /></div>
                  <div className="space-y-1"><Label>Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Unit Cost (K)</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: +e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} /></div>
                </div>
                <Button className="w-full min-h-[44px] bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]" onClick={async () => {
                  const created = await addItem({ ...form, department_id: form.department_id || null, expiry_date: form.expiry_date || null } as any);
                  if (created) setShowAdd(false);
                }}>Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} title="Scan Inventory Barcode" />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5 text-primary" /> Total Items</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-primary">{items.length}</p></CardContent></Card>
        <Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-destructive">{lowStock.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><TrendingDown className="h-5 w-5" /> Expiring (30d)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{expiringSoon.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Inventory views">
        {([['stock', `Stock List (${items.length})`], ['history', `Movement History (${movements.length})`]] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}
            className={`px-3 py-2 rounded-full text-xs font-bold min-h-[36px] ${view === key ? 'bg-[#003087] text-white' : 'bg-muted text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'history' ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Movement History</CardTitle></CardHeader>
          <CardContent>
            {movementsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
              movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No stock movements yet. Receives, issues, transfers, adjustments and write-offs will appear here.</p>
              ) : renderMovementRows(movements.slice(0, 100))}
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Stock List</CardTitle>
            <Input type="search" aria-label="Search by name or barcode..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            filtered.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-1">No items found</p>
                <p className="text-sm text-muted-foreground mb-4">Add inventory items to start tracking stock levels.</p>
                <Button onClick={() => setShowAdd(true)} className="gap-1.5 min-h-[44px]"><Plus className="h-4 w-4" /> Add Item</Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.slice(0, 50).map(item => (
                  <div key={item.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">{item.category} • {departmentNameFor(item) || 'No department'} • {item.supplier || 'No supplier'} {item.barcode ? `• ${item.barcode}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right shrink-0">
                        <div>
                          <p className={`font-bold ${item.quantity_available <= item.reorder_level ? 'text-destructive' : 'text-foreground'}`}>{item.quantity_available} {item.unit}</p>
                          <p className="text-xs text-muted-foreground">K{item.unit_cost}/{item.unit}</p>
                        </div>
                        {item.quantity_available <= item.reorder_level && <Badge variant="destructive">Low</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {(['received', 'issued', 'transferred', 'adjusted', 'written_off'] as MovementAction[]).map(action => (
                        <Button key={action} size="sm" variant="outline" className="text-xs min-h-[36px]" onClick={() => openMovement(item, action)}>
                          {ACTION_META[action].label}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" className="text-xs min-h-[36px] gap-1" onClick={() => openItemHistory(item)}><History className="h-3.5 w-3.5" /> History</Button>
                      <Button size="sm" variant="ghost" className="text-xs min-h-[36px]" onClick={() => { setEditItem(item); setEditDepartmentId(item.department_id || ''); }}>Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>
      )}

      {/* Movement dialog */}
      <Dialog open={!!moveItem} onOpenChange={o => { if (!o) setMoveItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowDownUp className="h-4 w-4" /> {moveItem ? `${ACTION_META[moveAction].label} — ${moveItem.item_name}` : 'Stock movement'}</DialogTitle></DialogHeader>
          {moveItem && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{ACTION_META[moveAction].hint}</p>
              <p className="text-sm">On hand: <span className="font-bold text-foreground">{moveItem.quantity_available} {moveItem.unit}</span>{departmentNameFor(moveItem) ? ` • ${departmentNameFor(moveItem)}` : ''}</p>
              <div className="space-y-1">
                <Label>{moveAction === 'adjusted' ? 'Adjustment (signed)' : 'Quantity'}</Label>
                <Input type="number" step="any" value={moveForm.quantity} onChange={e => setMoveForm({...moveForm, quantity: +e.target.value})} />
              </div>
              {moveAction === 'transferred' && departmentPicker(moveForm.toDepartmentId, v => setMoveForm({...moveForm, toDepartmentId: v}), 'Destination department')}
              {moveAction === 'issued' && departments.length > 0 && departmentPicker(moveForm.toDepartmentId, v => setMoveForm({...moveForm, toDepartmentId: v}), 'Issued to department (optional)')}
              {moveAction === 'written_off' && (
                <div className="space-y-1"><Label>Write-off reason type</Label>
                  <Select value={moveForm.writeOffKind} onValueChange={v => setMoveForm({...moveForm, writeOffKind: v as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="written_off">Written off</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1"><Label>Reason</Label><Input value={moveForm.reason} onChange={e => setMoveForm({...moveForm, reason: e.target.value})} placeholder="e.g. Ward requisition, stocktake count, supplier delivery" /></div>
              <div className="space-y-1"><Label>Reference (optional)</Label><Input value={moveForm.reference} onChange={e => setMoveForm({...moveForm, reference: e.target.value})} placeholder="GRN, requisition or invoice number" /></div>
              {moveError && <p role="alert" className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{moveError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" className="min-h-[44px]" onClick={() => setMoveItem(null)}>Cancel</Button>
                <Button className="min-h-[44px] bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]" disabled={moveBusy} onClick={submitMovement}>
                  {moveBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : ACTION_META[moveAction].label}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog — department as the item's location */}
      <Dialog open={!!editItem} onOpenChange={o => { if (!o) setEditItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Edit — {editItem?.item_name}</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {departmentPicker(editDepartmentId, setEditDepartmentId)}
              <p className="text-xs text-muted-foreground">Quantities change only through Receive, Issue, Transfer, Adjust and Write-off, so every change stays in the movement history.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" className="min-h-[44px]" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button className="min-h-[44px] bg-[#FFC439] text-slate-950 hover:bg-[#f5b921]" onClick={async () => {
                  await updateItem(editItem.id, { department_id: editDepartmentId || null } as any);
                  setEditItem(null);
                }}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Per-item history dialog */}
      <Dialog open={!!historyItem} onOpenChange={o => { if (!o) setHistoryItem(null); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>History — {historyItem?.item_name}</DialogTitle></DialogHeader>
          {itemMovementsLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            itemMovements.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No movements recorded for this item yet.</p> :
            renderMovementRows(itemMovements)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Re-exported for callers that typed movements against the workflow.
export type { HospitalMovementType };
