
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Stethoscope, 
  Calendar, 
  Users, 
  FileText, 
  Package, 
  Settings,
  ClipboardList,
  MessageSquare 
} from 'lucide-react';

export const HealthPersonnelWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "Professional Profile",
      description: "Complete credentials and specializations",
      icon: <Stethoscope className="h-5 w-5" />,
      action: () => handleNavigation('/profile-setup', 'Setup Profile'),
      completed: false,
      route: '/profile-setup'
    },
    {
      title: "Schedule Management",
      description: "Set availability and working hours",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false,
      route: '/provider-dashboard'
    },
    {
      title: "Patient Waitlist",
      description: "Review and manage appointments",
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false,
      route: '/provider-dashboard'
    },
    {
      title: "Prescriptions",
      description: "Digital signatures and prescriptions",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false,
      route: '/provider-dashboard'
    },
    {
      title: "Inventory",
      description: "Medication and supply management",
      icon: <Package className="h-5 w-5" />,
      action: () => navigate('/pharmacy-inventory'),
      completed: false,
      route: '/pharmacy-inventory'
    },
    {
      title: "Patient Chat",
      description: "Communicate with patients",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => navigate('/chat'),
      completed: false,
      route: '/chat'
    },
    {
      title: "Applications",
      description: "Review healthcare applications",
      icon: <ClipboardList className="h-5 w-5" />,
      action: () => navigate('/healthcare-application'),
      completed: false,
      route: '/healthcare-application'
    },
    {
      title: "Settings",
      description: "Configure practice preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/settings'),
      completed: false,
      route: '/settings'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Healthcare Provider Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your practice and provide quality care to your patients
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-lg flex-shrink-0">
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
                variant={step.completed ? "outline" : "default"}
              >
                {step.completed ? "Manage" : "Setup"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
