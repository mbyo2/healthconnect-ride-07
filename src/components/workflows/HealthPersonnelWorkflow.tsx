
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
      title: "Setup Profile",
      description: "Complete your professional profile and credentials",
      icon: <Stethoscope className="h-5 w-5" />,
      action: () => handleNavigation('/profile-setup', 'Setup Profile'),
      completed: false
    },
    {
      title: "Manage Schedule",
      description: "Set your availability and working hours",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false
    },
    {
      title: "Patient Waitlist",
      description: "Review and manage patient appointments",
      icon: <Users className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false
    },
    {
      title: "Digital Signatures",
      description: "Manage prescriptions and digital signatures",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/provider-dashboard'),
      completed: false
    },
    {
      title: "Pharmacy Inventory",
      description: "Manage medication inventory and supplies",
      icon: <Package className="h-5 w-5" />,
      action: () => navigate('/pharmacy-inventory'),
      completed: false
    },
    {
      title: "Patient Communication",
      description: "Chat with patients and provide consultations",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => navigate('/chat'),
      completed: false
    },
    {
      title: "Applications Review",
      description: "Review healthcare applications and certifications",
      icon: <ClipboardList className="h-5 w-5" />,
      action: () => navigate('/healthcare-application'),
      completed: false
    },
    {
      title: "Settings",
      description: "Configure practice settings and preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/settings'),
      completed: false
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold">Healthcare Provider Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your practice and provide quality care to your patients
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
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
                {step.completed ? "Manage" : "Setup"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
