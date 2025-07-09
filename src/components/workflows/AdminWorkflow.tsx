
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
      description: "Manage user accounts, roles, and permissions",
      icon: <Users className="h-5 w-5" />,
      action: () => handleNavigation('/admin-dashboard/users', 'User Management'),
      completed: false
    },
    {
      title: "Provider Applications",
      description: "Review and approve healthcare provider applications",
      icon: <FileCheck className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/applications'),
      completed: false
    },
    {
      title: "System Analytics",
      description: "View platform usage and performance metrics",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/analytics'),
      completed: false
    },
    {
      title: "Financial Management",
      description: "Manage payments, billing, and financial reports",
      icon: <CreditCard className="h-5 w-5" />,
      action: () => navigate('/admin-wallet'),
      completed: false
    },
    {
      title: "Institution Management",
      description: "Manage healthcare institutions and facilities",
      icon: <Building2 className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/institutions'),
      completed: false
    },
    {
      title: "Create Admins",
      description: "Create new admin and super admin accounts",
      icon: <UserPlus className="h-5 w-5" />,
      action: () => navigate('/create-admin'),
      completed: false
    },
    {
      title: "System Settings",
      description: "Configure platform settings and preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/settings'),
      completed: false
    },
    {
      title: "Security & Compliance",
      description: "Manage security settings and compliance reports",
      icon: <ShieldCheck className="h-5 w-5" />,
      action: () => navigate('/admin-dashboard/security'),
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Admin Control Center</h2>
        <p className="text-muted-foreground mt-2">
          Manage the platform, users, and ensure smooth operations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  {step.icon}
                </div>
                <CardTitle className="text-sm">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-3">
                {step.description}
              </CardDescription>
              <Button 
                onClick={step.action}
                size="sm" 
                className="w-full hover:shadow-sm transition-all active:scale-95"
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
