import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BarChart3, DollarSign, Building2, TrendingUp, Users, ShieldCheck } from 'lucide-react';

export const CXOWorkflow = () => {
  const quickActions = [
    { to: '/institution/reports', label: 'MIS Reports', description: 'Revenue, occupancy & performance', icon: <BarChart3 className="h-6 w-6" /> },
    { to: '/wallet', label: 'Financial Overview', description: 'P&L, revenue analytics', icon: <DollarSign className="h-6 w-6" /> },
    { to: '/hospital-management', label: 'Operations', description: 'Multi-location management', icon: <Building2 className="h-6 w-6" /> },
    { to: '/compliance-audit', label: 'Compliance', description: 'Audit & regulatory reports', icon: <ShieldCheck className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
        <p className="text-muted-foreground">Strategic overview — revenue, operations & performance KPIs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" /> Revenue (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Month to date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--%</p>
            <p className="text-sm text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Patient Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Bed Occupancy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--%</p>
            <p className="text-sm text-muted-foreground">Current occupancy</p>
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
