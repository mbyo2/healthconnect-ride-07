import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Activity, 
  FileText, 
  Search, 
  Settings, 
  BarChart3, 
  Users, 
  ClipboardList, 
  TestTube 
} from 'lucide-react';

export const LabWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "Lab Dashboard",
      description: "Overview of pending and completed tests",
      icon: <Activity className="h-5 w-5" />,
      route: '/lab-management'
    },
    {
      title: "Test Requests",
      description: "View and process lab test orders",
      icon: <ClipboardList className="h-5 w-5" />,
      route: '/lab-management'
    },
    {
      title: "Sample Tracking",
      description: "Track sample collection and processing",
      icon: <TestTube className="h-5 w-5" />,
      route: '/lab-management'
    },
    {
      title: "Results & Reports",
      description: "Enter results and generate reports",
      icon: <FileText className="h-5 w-5" />,
      route: '/medical-records'
    },
    {
      title: "Patient Lookup",
      description: "Search patient records and history",
      icon: <Search className="h-5 w-5" />,
      route: '/search'
    },
    {
      title: "Staff",
      description: "Lab technician management",
      icon: <Users className="h-5 w-5" />,
      route: '/lab-management'
    },
    {
      title: "Analytics",
      description: "Lab performance and turnaround times",
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/lab-management'
    },
    {
      title: "Settings",
      description: "Lab preferences and configuration",
      icon: <Settings className="h-5 w-5" />,
      route: '/settings'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Laboratory Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage lab tests, samples, and results efficiently
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <CardTitle className="text-xs leading-tight text-foreground">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-3 leading-tight">
                {step.description}
              </CardDescription>
              <Button 
                onClick={() => handleNavigation(step.route, step.title)}
                size="sm" 
                className="w-full hover:shadow-sm transition-all active:scale-95 touch-manipulation text-xs"
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
