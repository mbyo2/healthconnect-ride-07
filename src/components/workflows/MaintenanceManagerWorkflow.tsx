import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Wrench, Building2, AlertTriangle, ClipboardList, Settings, FileText } from 'lucide-react';

export const MaintenanceManagerWorkflow = () => {
  const quickActions = [
    { to: '/institution/devices', label: 'Asset Management', description: 'Equipment & facility maintenance', icon: <Wrench className="h-6 w-6" /> },
    { to: '/institution/reports', label: 'Work Orders', description: 'Maintenance requests & tickets', icon: <ClipboardList className="h-6 w-6" /> },
    { to: '/institution/settings', label: 'Vendor Contracts', description: 'Third-party vendor management', icon: <FileText className="h-6 w-6" /> },
    { to: '/institution-dashboard', label: 'Facility Overview', description: 'Building systems status', icon: <Building2 className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Maintenance & Contracts Dashboard</h1>
        <p className="text-muted-foreground">Asset maintenance, work orders & vendor management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Wrench className="h-5 w-5 text-primary" /> Open Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Pending maintenance</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Requires immediate fix</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-5 w-5" /> Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Vendor contracts</p>
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
