import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Search, TrendingDown } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/list-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useHospitalModule } from '@/hooks/useHospitalModule';

export const InventoryPurchase = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: supplies, loading, error, refresh } = useHospitalModule<any>(
    'hospital_inventory', 'institution_id', hospital?.id, { orderBy: 'item_name', ascending: true }
  );

  const filteredSupplies = supplies.filter(s =>
    (s.item_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );
  const lowStock = supplies.filter(s => (s.quantity_available ?? 0) <= (s.reorder_level ?? 0));
  const expiringSoon = supplies.filter(
    s => s.expiry_date && new Date(s.expiry_date).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Inventory & Purchase Management</h3>
          <p className="text-sm text-muted-foreground">Medical supplies, reorder levels & expiry monitoring</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh}>Refresh</Button>
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
            <EmptyState icon={Package} title="No inventory items" description="Add medical supplies to track stock levels, suppliers and expiry." />
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
    </div>
  );
};
