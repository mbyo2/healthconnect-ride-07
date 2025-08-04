import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  Package, 
  Settings,
  BarChart3,
  Shield 
} from 'lucide-react';

export const InstitutionAdminWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "Institution Profile",
      description: "Setup facility details and certifications",
      icon: <Building2 className="h-5 w-5" />,
      action: () => handleNavigation('/institution-portal', 'Institution Profile'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Staff Management",
      description: "Manage healthcare personnel",
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/institution-portal'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Facility Scheduling",
      description: "Manage schedules and availability",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/institution-portal'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Compliance",
      description: "Manage certifications and compliance",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/institution-portal'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Inventory",
      description: "Medical supplies and equipment",
      icon: <Package className="h-5 w-5" />,
      action: () => navigate('/pharmacy-inventory'),
      completed: false,
      route: '/pharmacy-inventory'
    },
    {
      title: "Analytics",
      description: "Institution performance metrics",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/institution-portal'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Security",
      description: "Access control and security",
      icon: <Shield className="h-5 w-5" />,
      action: () => navigate('/institution-portal'),
      completed: false,
      route: '/institution-portal'
    },
    {
      title: "Settings",
      description: "Institution preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/settings'),
      completed: false,
      route: '/settings'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold">Institution Admin Center</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your healthcare institution and ensure operational excellence
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <CardTitle className="text-xs leading-tight">{step.title}</CardTitle>
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