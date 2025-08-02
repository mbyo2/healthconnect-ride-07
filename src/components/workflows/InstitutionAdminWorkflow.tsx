
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Calendar, 
  BarChart3, 
  FileText, 
  Settings,
  Package,
  CreditCard 
} from 'lucide-react';

export const InstitutionAdminWorkflow = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    {
      title: "Institution Profile",
      description: "Manage institution details and information",
      icon: <Building2 className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/profile'),
      completed: false
    },
    {
      title: "Staff Management",
      description: "Manage healthcare staff and their roles",
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/staff'),
      completed: false
    },
    {
      title: "Facility Scheduling",
      description: "Manage facility schedules and availability",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/scheduling'),
      completed: false
    },
    {
      title: "Inventory Management",
      description: "Manage medical supplies and equipment",
      icon: <Package className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/inventory'),
      completed: false
    },
    {
      title: "Financial Reports",
      description: "View financial reports and billing information",
      icon: <CreditCard className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/finance'),
      completed: false
    },
    {
      title: "Performance Analytics",
      description: "View institution performance metrics",
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/analytics'),
      completed: false
    },
    {
      title: "Documentation",
      description: "Manage institutional documentation and policies",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/documents'),
      completed: false
    },
    {
      title: "Institution Settings",
      description: "Configure institution-specific settings",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/institution-dashboard/settings'),
      completed: false
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold">Institution Management</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your healthcare institution and optimize operations
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                  {step.icon}
                </div>
                <CardTitle className="text-sm leading-tight">{step.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs mb-4 leading-relaxed">
                {step.description}
              </CardDescription>
              <Button 
                onClick={step.action}
                size="sm" 
                className="w-full hover:shadow-sm transition-all active:scale-95 touch-manipulation"
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
