
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
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

  const workflowSteps = [
    {
      title: "Setup Profile",
      description: "Complete your professional profile and credentials",
      icon: <Stethoscope className="h-5 w-5" />,
      action: () => navigate('/profile-setup'),
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Healthcare Provider Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Manage your practice and provide quality care to your patients
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
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
                className="w-full"
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
