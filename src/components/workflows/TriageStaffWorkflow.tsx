import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { AlertTriangle, Heart, Users, Clock, Stethoscope, Search } from 'lucide-react';

export const TriageStaffWorkflow = () => {
  const quickActions = [
    { to: '/appointments', label: 'Triage Queue', description: 'Assess & prioritize patients', icon: <Users className="h-6 w-6" /> },
    { to: '/medical-records', label: 'Patient Vitals', description: 'Record initial assessment', icon: <Heart className="h-6 w-6" /> },
    { to: '/emergency', label: 'Emergency Cases', description: 'Critical & urgent patients', icon: <AlertTriangle className="h-6 w-6" /> },
    { to: '/search', label: 'Patient Lookup', description: 'Search patient history', icon: <Search className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Triage Dashboard</h1>
        <p className="text-muted-foreground">Patient assessment, prioritization & emergency routing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Immediate attention</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Stethoscope className="h-5 w-5 text-primary" /> Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> Standard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Normal queue</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" /> Total Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">In queue now</p>
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
