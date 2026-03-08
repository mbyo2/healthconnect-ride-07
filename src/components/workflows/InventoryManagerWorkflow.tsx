import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, TrendingDown, BarChart3, Truck, ClipboardList } from 'lucide-react';

export const InventoryManagerWorkflow = () => {
  const quickActions = [
    { to: '/pharmacy-inventory', label: 'Inventory', description: 'Stock levels & management', icon: <Package className="h-6 w-6" /> },
    { to: '/medications', label: 'Consumables', description: 'Medical supplies & surgical items', icon: <ClipboardList className="h-6 w-6" /> },
    { to: '/institution/reports', label: 'Reports', description: 'Usage analytics & audits', icon: <BarChart3 className="h-6 w-6" /> },
    { to: '/institution/settings', label: 'Procurement', description: 'Supplier orders & settlements', icon: <Truck className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Management Dashboard</h1>
        <p className="text-muted-foreground">Stock tracking, procurement, consumables & supplier management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Package className="h-5 w-5 text-primary" /> Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Active stock items</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingDown className="h-5 w-5" /> Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card key={action.to} className="hover:shadow-md transition-shadow cursor-pointer">
            <Link to={action.to}>
              <CardHeader className="pb-2">
                <div className="text-primary">{action.icon}</div>
                <CardTitle className="text-base">{action.label}</CardTitle>
                <CardDescription className="text-xs">{action.description}</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};
