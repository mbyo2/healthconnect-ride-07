import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Truck, MapPin, AlertTriangle, Phone, Clock, Navigation } from 'lucide-react';

export const AmbulanceStaffWorkflow = () => {
  const quickActions = [
    { to: '/emergency', label: 'Active Dispatch', description: 'Current emergency calls', icon: <AlertTriangle className="h-6 w-6" /> },
    { to: '/map', label: 'Navigation', description: 'Route & hospital locations', icon: <Navigation className="h-6 w-6" /> },
    { to: '/appointments', label: 'Transport Log', description: 'Patient transfer schedule', icon: <Truck className="h-6 w-6" /> },
    { to: '/chat', label: 'Dispatch Radio', description: 'Communication with dispatch', icon: <Phone className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ambulance & Transport Dashboard</h1>
        <p className="text-muted-foreground">Emergency dispatch, transport logs & route management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-destructive" /> Active Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Emergency dispatches</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5 text-primary" /> In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Patient transfers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5" /> Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Trips completed</p>
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
