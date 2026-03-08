import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingDown, Plus, Loader2, Search } from 'lucide-react';
import { useHospitalInventory } from '@/hooks/useHospitalInventory';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

export const InventoryManagerWorkflow = () => {
  const { items, loading, lowStock, expiringSoon, addItem } = useHospitalInventory();
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ item_name: '', category: 'consumable', quantity_available: 0, reorder_level: 10, unit: 'pcs', unit_cost: 0, supplier: '', barcode: '', location: '', expiry_date: '' });

  const filtered = items.filter(i =>
    i.item_name.toLowerCase().includes(search.toLowerCase()) ||
    (i.barcode || '').includes(search)
  );

  const handleScan = (code: string) => {
    setSearch(code);
    setShowScanner(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Hospital-wide stock: consumables, surgical, PPE, equipment & more</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScanner(!showScanner)} className="gap-1"><Search className="h-4 w-4" /> Scan</Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild><Button className="gap-1"><Plus className="h-4 w-4" /> Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Item Name</Label><Input value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
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
                  <div className="space-y-1"><Label>Location</Label><Input value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Ward/Store/OT" /></div>
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
                <Button className="w-full" onClick={async () => {
                  await addItem({ ...form, expiry_date: form.expiry_date || null } as any);
                  setShowAdd(false);
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stock List</CardTitle>
            <Input placeholder="Search by name or barcode..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
            filtered.length === 0 ? <p className="text-muted-foreground text-center py-4">No items found</p> : (
              <div className="space-y-2">
                {filtered.slice(0, 50).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-sm text-muted-foreground">{item.category} • {item.location || 'N/A'} • {item.supplier || 'No supplier'} {item.barcode ? `• ${item.barcode}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className={`font-bold ${item.quantity_available <= item.reorder_level ? 'text-destructive' : ''}`}>{item.quantity_available} {item.unit}</p>
                        <p className="text-xs text-muted-foreground">K{item.unit_cost}/{item.unit}</p>
                      </div>
                      {item.quantity_available <= item.reorder_level && <Badge variant="destructive">Low</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </CardContent>
      </Card>
    </div>
  );
};
