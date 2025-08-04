
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  ShieldCheck, 
  Users, 
  Settings, 
  BarChart3, 
  FileCheck, 
  CreditCard,
  Building2,
  UserPlus 
} from 'lucide-react';

export const AdminWorkflow = () => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  
  const handleNavigation = (route: string, title: string) => {
    navigate(route);
    showSuccess({ message: `Opening ${title}...` });
  };

  const workflowSteps = [
    {
      title: "User Management",
      description: "Manage accounts and permissions",
      icon: <Users className="h-5 w-5" />,
      action: () => handleNavigation('/admin-dashboard/users', 'User Management'),
      completed: false,
      route: '/admin-dashboard'
    },
    {
      title: "Provider Apps",
      description: "Review healthcare applications",
      icon: <FileCheck className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/applications'),
      completed: false,
      route: '/admin-dashboard'
    },
    {
      title: "Analytics",
      description: "Platform metrics and reports",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/analytics'),
      completed: false,
      route: '/admin-dashboard'
    },
    {
      title: "Financial",
      description: "Payments and billing reports",
      icon: <CreditCard className="h-5 w-5" />,
      action: () => navigate('/admin-wallet'),
      completed: false,
      route: '/admin-wallet'
    },
    {
      title: "Institutions",
      description: "Healthcare facility management",
      icon: <Building2 className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/institutions'),
      completed: false,
      route: '/admin-dashboard'
    },
    {
      title: "Create Admins",
      description: "New admin accounts",
      icon: <UserPlus className="h-5 w-5" />,
      action: () => navigate('/create-admin'),
      completed: false,
      route: '/create-admin'
    },
    {
      title: "Settings",
      description: "Platform configuration",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/settings'),
      completed: false,
      route: '/settings'
    },
    {
      title: "Security",
      description: "Security and compliance",
      icon: <ShieldCheck className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/security'),
      completed: false,
      route: '/admin-dashboard'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold">Admin Control Center</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage the platform, users, and ensure smooth operations
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-500/10 rounded-lg flex-shrink-0">
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
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
