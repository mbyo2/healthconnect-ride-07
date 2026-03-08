import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Stethoscope, Calendar, Brain, Heart, Users, Pill } from 'lucide-react';

export const SpecialistWorkflow = () => {
  const quickActions = [
    { to: '/provider-dashboard', label: 'My Dashboard', description: 'Specialist clinical overview', icon: <Stethoscope className="h-6 w-6" /> },
    { to: '/appointments', label: 'Appointments', description: 'Patient consultations & procedures', icon: <Calendar className="h-6 w-6" /> },
    { to: '/medical-records', label: 'Patient Records', description: 'Clinical notes & treatment plans', icon: <Heart className="h-6 w-6" /> },
    { to: '/ai-diagnostics', label: 'AI Assistant', description: 'Clinical decision support', icon: <Brain className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Specialist Dashboard</h1>
        <p className="text-muted-foreground">Dialysis, IVF & specialty clinical workflows</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-primary" /> Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Scheduled procedures</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5" /> Active Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Under treatment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Pill className="h-5 w-5" /> Treatment Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Active plans</p>
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
