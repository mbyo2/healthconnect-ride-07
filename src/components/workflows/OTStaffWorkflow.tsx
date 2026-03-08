import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Scissors, Clock, ClipboardCheck, AlertTriangle, Calendar, Heart } from 'lucide-react';

export const OTStaffWorkflow = () => {
  const quickActions = [
    { to: '/appointments', label: 'Surgery Schedule', description: 'Today\'s OT schedule & queue', icon: <Calendar className="h-6 w-6" /> },
    { to: '/medical-records', label: 'Patient Records', description: 'Pre-op & post-op notes', icon: <Heart className="h-6 w-6" /> },
    { to: '/emergency', label: 'Emergency OT', description: 'Emergency surgical cases', icon: <AlertTriangle className="h-6 w-6" /> },
    { to: '/chat', label: 'Team Chat', description: 'Surgical team coordination', icon: <ClipboardCheck className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Operation Theatre Dashboard</h1>
        <p className="text-muted-foreground">Surgical scheduling, timestamps, consent & anaesthesia logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Scissors className="h-5 w-5 text-primary" /> Surgeries Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Scheduled procedures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Active surgeries</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Emergency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Pending emergency cases</p>
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
