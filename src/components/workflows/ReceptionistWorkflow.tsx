import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Users, Calendar, Clock, ClipboardList, UserPlus, Search } from 'lucide-react';

export const ReceptionistWorkflow = () => {
  const quickActions = [
    { to: '/appointments', label: 'Appointments', description: 'Schedule & manage appointments', icon: <Calendar className="h-6 w-6" /> },
    { to: '/institution/patients', label: 'Patient Check-In', description: 'Register & check-in patients', icon: <UserPlus className="h-6 w-6" /> },
    { to: '/search', label: 'Patient Lookup', description: 'Search patient records', icon: <Search className="h-6 w-6" /> },
    { to: '/chat', label: 'Messages', description: 'Internal & patient communication', icon: <ClipboardList className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Front Office Dashboard</h1>
        <p className="text-muted-foreground">Patient registration, check-in & appointment management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" /> Today's Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Patients waiting</p>
          </CardContent>
        </Card>
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-accent-foreground" /> Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-accent-foreground">--</p>
            <p className="text-sm text-muted-foreground">Scheduled today</p>
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
