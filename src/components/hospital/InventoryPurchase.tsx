import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Search, TrendingDown, ShoppingCart, Plus, FileText, Truck, ClipboardList } from 'lucide-react';

export const InventoryPurchase = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [supplies] = useState([
    { id: 1, name: 'Surgical Gloves (L)', category: 'Consumable', qty: 500, unit: 'pairs', reorder: 200, supplier: 'MedSupply Zambia', lastOrder: '2026-02-15' },
    { id: 2, name: 'IV Cannula 20G', category: 'Consumable', qty: 80, unit: 'pcs', reorder: 100, supplier: 'PharmaCo', lastOrder: '2026-02-20' },
    { id: 3, name: 'Oxygen Mask (Adult)', category: 'Equipment', qty: 25, unit: 'pcs', reorder: 10, supplier: 'MedEquip Ltd', lastOrder: '2026-01-10' },
    { id: 4, name: 'Syringe 5ml', category: 'Consumable', qty: 2000, unit: 'pcs', reorder: 500, supplier: 'MedSupply Zambia', lastOrder: '2026-02-28' },
    { id: 5, name: 'Gauze Roll (Sterile)', category: 'Consumable', qty: 150, unit: 'rolls', reorder: 50, supplier: 'PharmaCo', lastOrder: '2026-02-25' },
    { id: 6, name: 'Suture Kit (Nylon 3-0)', category: 'Surgical', qty: 30, unit: 'kits', reorder: 20, supplier: 'SurgiTech', lastOrder: '2026-02-18' },
  ]);

  const [purchaseOrders] = useState([
    { id: 'PO-001', supplier: 'MedSupply Zambia', items: 5, total: 25000, status: 'approved', date: '2026-03-01' },
    { id: 'PO-002', supplier: 'PharmaCo', items: 3, total: 15000, status: 'pending', date: '2026-03-03' },
    { id: 'PO-003', supplier: 'SurgiTech', items: 8, total: 45000, status: 'delivered', date: '2026-02-20' },
  ]);

  const [consumptionLog] = useState([
    { dept: 'Surgery', item: 'Surgical Gloves (L)', qty: 50, date: '2026-03-04' },
    { dept: 'ICU', item: 'IV Cannula 20G', qty: 20, date: '2026-03-04' },
    { dept: 'Emergency', item: 'Gauze Roll', qty: 10, date: '2026-03-03' },
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Inventory & Purchase Management</h3>
          <p className="text-sm text-muted-foreground">Medical supplies, procurement & department consumption</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
          <Button size="sm" variant="outline" className="gap-2"><ShoppingCart className="h-4 w-4" /> New PO</Button>
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock" className="text-xs">Stock Register</TabsTrigger>
          <TabsTrigger value="purchase" className="text-xs">Purchase Orders</TabsTrigger>
          <TabsTrigger value="consumption" className="text-xs">Consumption</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search supplies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2 text-xs">Item</th><th className="p-2 text-xs">Category</th>
                <th className="p-2 text-xs">Qty</th><th className="p-2 text-xs">Unit</th>
                <th className="p-2 text-xs">Supplier</th><th className="p-2 text-xs">Status</th>
              </tr></thead>
              <tbody>
                {supplies.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">{s.name}</td>
                    <td className="p-2 text-muted-foreground">{s.category}</td>
                    <td className="p-2 text-foreground">{s.qty}</td>
                    <td className="p-2 text-muted-foreground">{s.unit}</td>
                    <td className="p-2 text-muted-foreground">{s.supplier}</td>
                    <td className="p-2">
                      <Badge variant={s.qty <= s.reorder ? 'destructive' : 'outline'} className="text-[10px]">
                        {s.qty <= s.reorder ? 'Reorder' : 'In Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="space-y-3">
          {purchaseOrders.map(po => (
            <Card key={po.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{po.id} — {po.supplier}</p>
                  <p className="text-xs text-muted-foreground">{po.items} items • K{po.total.toLocaleString()} • {po.date}</p>
                </div>
                <Badge variant={po.status === 'delivered' ? 'default' : po.status === 'approved' ? 'secondary' : 'outline'} className="text-xs capitalize">{po.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="consumption" className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2 text-xs">Department</th><th className="p-2 text-xs">Item</th>
                <th className="p-2 text-xs">Qty Used</th><th className="p-2 text-xs">Date</th>
              </tr></thead>
              <tbody>
                {consumptionLog.map((c, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">{c.dept}</td>
                    <td className="p-2 text-muted-foreground">{c.item}</td>
                    <td className="p-2 text-foreground">{c.qty}</td>
                    <td className="p-2 text-muted-foreground">{c.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
