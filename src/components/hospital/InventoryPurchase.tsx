import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package, Search, TrendingDown, Plus, Loader2 } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InventoryPurchase = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    item_name: '',
    category: 'Medical Supplies',
    quantity_available: 0,
    unit: 'boxes',
    supplier: '',
    reorder_level: 10,
    expiry_date: '',
  });

  const { data: supplies, loading, error, refresh } = useHospitalModule<any>(
    'hospital_inventory', 'institution_id', hospital?.id, { orderBy: 'item_name', ascending: true }
  );

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.item_name) {
      toast.error('Item name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: err } = await supabase.from('hospital_inventory' as any).insert({
        institution_id: hospital?.id,
        ...newItem,
        quantity_available: Number(newItem.quantity_available),
        reorder_level: Number(newItem.reorder_level),
      });
      if (err) throw err;

      toast.success('Inventory item added successfully');
      setIsAddDialogOpen(false);
      setNewItem({
        item_name: '',
        category: 'Medical Supplies',
        quantity_available: 0,
        unit: 'boxes',
        supplier: '',
        reorder_level: 10,
        expiry_date: '',
      });
      refresh();
    } catch (e: any) {
      console.error('Error adding inventory item:', e);
      toast.error(e.message || 'Failed to add inventory item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSupplies = supplies.filter(s =>
    (s.item_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const lowStock = supplies.filter(s => (s.quantity_available ?? 0) <= (s.reorder_level ?? 0));
  const expiringSoon = supplies.filter(
    s => s.expiry_date && new Date(s.expiry_date).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Inventory & Purchase Management</h3>
          <p className="text-sm text-muted-foreground">Medical supplies, reorder levels & expiry monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{supplies.length}</p>
          <p className="text-xs text-muted-foreground">Stock Items</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingDown className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Need Reorder</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-foreground">{expiringSoon.length}</p>
          <p className="text-xs text-muted-foreground">Expiring ≤ 90d</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock" className="text-xs">Stock Register</TabsTrigger>
          <TabsTrigger value="reorder" className="text-xs">Reorder List</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search supplies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          {loading ? (
            <ListSkeleton count={5} variant="compact" />
          ) : error ? (
            <EmptyState icon={Package} title="Could not load inventory" description={error} actionLabel="Retry" onAction={refresh} />
          ) : filteredSupplies.length === 0 ? (
            <EmptyState 
              icon={Package} 
              title="No inventory items" 
              description="Add medical supplies to track stock levels, suppliers and expiry."
              actionLabel="Add First Item"
              onAction={() => setIsAddDialogOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 text-xs">Item</th><th className="p-2 text-xs">Category</th>
                  <th className="p-2 text-xs">Qty</th><th className="p-2 text-xs">Unit</th>
                  <th className="p-2 text-xs">Supplier</th><th className="p-2 text-xs">Expiry</th><th className="p-2 text-xs">Status</th>
                </tr></thead>
                <tbody>
                  {filteredSupplies.map(s => (
                    <tr key={s.id} className="border-b border-border">
                      <td className="p-2 font-medium text-foreground">{s.item_name}</td>
                      <td className="p-2 text-muted-foreground">{s.category || '—'}</td>
                      <td className="p-2 text-foreground">{s.quantity_available ?? 0}</td>
                      <td className="p-2 text-muted-foreground">{s.unit || '—'}</td>
                      <td className="p-2 text-muted-foreground">{s.supplier || '—'}</td>
                      <td className="p-2 text-muted-foreground">{s.expiry_date || '—'}</td>
                      <td className="p-2">
                        <Badge variant={(s.quantity_available ?? 0) <= (s.reorder_level ?? 0) ? 'destructive' : 'outline'} className="text-[10px]">
                          {(s.quantity_available ?? 0) <= (s.reorder_level ?? 0) ? 'Reorder' : 'In Stock'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reorder" className="space-y-3 pt-3">
          {lowStock.length === 0 ? (
            <EmptyState icon={Package} title="Nothing below reorder level" description="All tracked supplies are above their reorder thresholds." />
          ) : (
            lowStock.map(s => (
              <Card key={s.id} className="border-amber-500/30">
                <CardContent className="pt-4 flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {s.quantity_available ?? 0} {s.unit || ''} • Reorder level: {s.reorder_level ?? 0}
                      {s.supplier ? ` • Supplier: ${s.supplier}` : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Add Item Modal */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3 py-2">
            <div>
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={newItem.item_name}
                onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder="e.g. Paracetamol 500mg / Surgical Gloves"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={newItem.unit}
                  onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="e.g. boxes, packs, vials"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity_available">Quantity Available</Label>
                <Input
                  id="quantity_available"
                  type="number"
                  value={newItem.quantity_available}
                  onChange={e => setNewItem({ ...newItem, quantity_available: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  value={newItem.reorder_level}
                  onChange={e => setNewItem({ ...newItem, reorder_level: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="supplier">Supplier Name</Label>
                <Input
                  id="supplier"
                  value={newItem.supplier}
                  onChange={e => setNewItem({ ...newItem, supplier: e.target.value })}
                  placeholder="e.g. PharmaCorp"
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={newItem.expiry_date}
                  onChange={e => setNewItem({ ...newItem, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
