import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { BarChart3, DollarSign, Building2, TrendingUp, Users, ShieldCheck, Loader2, BedDouble, Clock, FileText } from 'lucide-react';
import { useCXODashboard } from '@/hooks/useCXODashboard';

export const CXOWorkflow = () => {
  const { metrics, loading } = useCXODashboard();

  const quickActions = [
    { to: '/institution/reports', label: 'MIS Reports', description: 'Revenue, occupancy & performance', icon: <BarChart3 className="h-6 w-6" /> },
    { to: '/wallet', label: 'Financial Overview', description: 'P&L, revenue analytics', icon: <DollarSign className="h-6 w-6" /> },
    { to: '/hospital-management', label: 'Operations', description: 'Multi-location management', icon: <Building2 className="h-6 w-6" /> },
    { to: '/compliance-audit', label: 'Compliance', description: 'Audit & regulatory reports', icon: <ShieldCheck className="h-6 w-6" /> },
  ];

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `K${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `K${(n / 1_000).toFixed(0)}`;
    return `K${n.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Executive Dashboard</h1>
        <p className="text-muted-foreground">Strategic overview — revenue, operations & performance KPIs</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5 text-primary" /> Revenue (MTD)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{fmt(metrics.revenueMTD)}</p>
                <p className="text-sm text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" /> Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${metrics.growthPercent >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {metrics.growthPercent >= 0 ? '+' : ''}{metrics.growthPercent}%
                </p>
                <p className="text-sm text-muted-foreground">vs last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Patient Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.patientVolume}</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><BedDouble className="h-5 w-5" /> Bed Occupancy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metrics.bedOccupancy}%</p>
                <p className="text-sm text-muted-foreground">{metrics.occupiedBeds}/{metrics.totalBeds} beds</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{fmt(metrics.outstandingBalance)}</p>
                <p className="text-xs text-muted-foreground">Unpaid invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.staffCount}</p>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.todayAppointments}</p>
                <p className="text-xs text-muted-foreground">Appointments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" /> Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{metrics.pendingClaims}</p>
                <p className="text-xs text-muted-foreground">Pending insurance</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

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
