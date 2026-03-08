import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Droplets, MapPin, ClipboardList, Users, Truck, Search } from 'lucide-react';

export const PhlebotomistWorkflow = () => {
  const quickActions = [
    { to: '/lab-management', label: 'Sample Queue', description: 'Pending collections & processing', icon: <Droplets className="h-6 w-6" /> },
    { to: '/map', label: 'Home Collections', description: 'Route & home visit schedule', icon: <MapPin className="h-6 w-6" /> },
    { to: '/medical-records', label: 'Sample Status', description: 'Track sample processing', icon: <ClipboardList className="h-6 w-6" /> },
    { to: '/connections', label: 'Patient Lookup', description: 'Search patient records', icon: <Search className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Phlebotomist Dashboard</h1>
        <p className="text-muted-foreground">Sample collection, home visits & tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Droplets className="h-5 w-5 text-primary" /> Pending Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Samples to collect</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5" /> Home Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Collected today</p>
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
