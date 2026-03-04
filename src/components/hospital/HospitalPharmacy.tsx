import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Search, AlertTriangle, Package, TrendingDown, ShoppingCart, Plus, CheckCircle2 } from 'lucide-react';

export const HospitalPharmacy = ({ hospital }: { hospital: any }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const [inventory] = useState([
    { id: 1, name: 'Paracetamol 500mg', generic: 'Acetaminophen', batch: 'B2026-001', qty: 5000, reorder: 1000, expiry: '2027-06-15', category: 'Analgesic', price: 2.5 },
    { id: 2, name: 'Amoxicillin 250mg', generic: 'Amoxicillin', batch: 'B2026-002', qty: 800, reorder: 500, expiry: '2026-12-30', category: 'Antibiotic', price: 15 },
    { id: 3, name: 'Metformin 500mg', generic: 'Metformin HCl', batch: 'B2026-003', qty: 200, reorder: 500, expiry: '2026-09-20', category: 'Antidiabetic', price: 8 },
    { id: 4, name: 'Omeprazole 20mg', generic: 'Omeprazole', batch: 'B2026-004', qty: 1500, reorder: 300, expiry: '2027-03-10', category: 'PPI', price: 5 },
    { id: 5, name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin', batch: 'B2026-005', qty: 50, reorder: 200, expiry: '2026-04-01', category: 'Antibiotic', price: 12 },
  ]);

  const [pendingOrders] = useState([
    { id: 1, patient: 'John Mwale', doctor: 'Dr. Banda', items: 3, status: 'pending', time: '10:30 AM' },
    { id: 2, patient: 'Mary Phiri', doctor: 'Dr. Tembo', items: 2, status: 'dispensing', time: '10:45 AM' },
    { id: 3, patient: 'Peter Zulu', doctor: 'Dr. Mulenga', items: 5, status: 'ready', time: '09:15 AM' },
  ]);

  const lowStock = inventory.filter(i => i.qty <= i.reorder);
  const nearExpiry = inventory.filter(i => new Date(i.expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">In-Hospital Pharmacy</h3>
          <p className="text-sm text-muted-foreground">Drug dispensing, stock management & prescription processing</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Stock</Button>
          <Button size="sm" variant="outline" className="gap-2"><ShoppingCart className="h-4 w-4" /> Purchase Order</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center">
          <Package className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{inventory.length}</p>
          <p className="text-xs text-muted-foreground">Total Items</p>
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
          <p className="text-2xl font-bold text-foreground">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground">Pending Orders</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="text-xs">Prescription Orders</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Drug Inventory</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {pendingOrders.map(o => (
            <Card key={o.id}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{o.patient}</p>
                  <p className="text-xs text-muted-foreground">{o.doctor} • {o.items} items • {o.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === 'ready' ? 'default' : o.status === 'dispensing' ? 'secondary' : 'outline'} className="text-xs capitalize">{o.status}</Badge>
                  {o.status === 'pending' && <Button size="sm" variant="outline">Dispense</Button>}
                  {o.status === 'ready' && <Button size="sm" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Handed Over</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search drugs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-muted-foreground">
                <th className="p-2 text-xs">Drug Name</th><th className="p-2 text-xs">Generic</th><th className="p-2 text-xs">Batch</th>
                <th className="p-2 text-xs">Qty</th><th className="p-2 text-xs">Expiry</th><th className="p-2 text-xs">Status</th>
              </tr></thead>
              <tbody>
                {inventory.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map(i => (
                  <tr key={i.id} className="border-b border-border">
                    <td className="p-2 font-medium text-foreground">{i.name}</td>
                    <td className="p-2 text-muted-foreground">{i.generic}</td>
                    <td className="p-2 text-muted-foreground">{i.batch}</td>
                    <td className="p-2 text-foreground">{i.qty}</td>
                    <td className="p-2 text-muted-foreground">{i.expiry}</td>
                    <td className="p-2">
                      {i.qty <= i.reorder ? <Badge variant="destructive" className="text-[10px]">Low</Badge> :
                       new Date(i.expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) ? <Badge variant="secondary" className="text-[10px]">Near Expiry</Badge> :
                       <Badge variant="outline" className="text-[10px]">OK</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {lowStock.map(i => (
            <Card key={i.id} className="border-amber-500/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <TrendingDown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.name} — Low Stock</p>
                  <p className="text-xs text-muted-foreground">Current: {i.qty} | Reorder Level: {i.reorder}</p>
                </div>
                <Button size="sm" variant="outline">Reorder</Button>
              </CardContent>
            </Card>
          ))}
          {nearExpiry.map(i => (
            <Card key={`exp-${i.id}`} className="border-destructive/30">
              <CardContent className="pt-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{i.name} — Expiring Soon</p>
                  <p className="text-xs text-muted-foreground">Batch: {i.batch} | Expiry: {i.expiry} | Qty: {i.qty}</p>
                </div>
                <Button size="sm" variant="destructive">Remove</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
