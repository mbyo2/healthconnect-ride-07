import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Microscope, FileText, Brain, Users, ClipboardList, Activity } from 'lucide-react';

export const PathologistWorkflow = () => {
  const quickActions = [
    { to: '/lab-management', label: 'Lab Oversight', description: 'Review & approve test results', icon: <Microscope className="h-6 w-6" /> },
    { to: '/medical-records', label: 'Reports', description: 'Generate diagnostic reports', icon: <FileText className="h-6 w-6" /> },
    { to: '/ai-diagnostics', label: 'AI Analysis', description: 'AI-assisted pathology', icon: <Brain className="h-6 w-6" /> },
    { to: '/connections', label: 'Referring Doctors', description: 'Provider communications', icon: <Users className="h-6 w-6" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pathologist Dashboard</h1>
        <p className="text-muted-foreground">Lab oversight, diagnostic reporting & quality control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-primary" /> Pending Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">--</p>
            <p className="text-sm text-muted-foreground">Results awaiting sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5" /> Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">--</p>
            <p className="text-sm text-muted-foreground">Reports finalized</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg"><Microscope className="h-5 w-5 text-destructive" /> Critical Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">--</p>
            <p className="text-sm text-muted-foreground">Require urgent review</p>
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
