
import React from 'react';
import { ApplicationStatusBanner, ProfileCompleteBanner } from '@/components/dashboard/StatusBanners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import { 
  Stethoscope, 
  Calendar, 
  Users, 
  FileText, 
  Settings,
  ClipboardList,
  MessageSquare,
  Brain,
  Wallet,
  AlertTriangle
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
      title: "My Schedule",
      description: "View and manage your availability & appointments",
      icon: <Calendar className="h-5 w-5" />,
      route: '/provider-calendar'
    },
    {
      title: "Patient Appointments",
      description: "Today's queue, upcoming & past consultations",
      icon: <ClipboardList className="h-5 w-5" />,
      route: '/appointments'
    },
    {
      title: "Patient Records",
      description: "Access and update patient medical records",
      icon: <Stethoscope className="h-5 w-5" />,
      route: '/medical-records'
    },
    {
      title: "Write Prescriptions",
      description: "Digital prescriptions with e-signature",
      icon: <FileText className="h-5 w-5" />,
      route: '/prescriptions'
    },
    {
      title: "AI Clinical Assistant",
      description: "AI-powered diagnostic support tool",
      icon: <Brain className="h-5 w-5" />,
      route: '/ai-diagnostics'
    },
    {
      title: "My Patients",
      description: "Your connected patient network",
      icon: <Users className="h-5 w-5" />,
      route: '/connections'
    },
    {
      title: "Patient Chat",
      description: "Secure messaging with patients",
      icon: <MessageSquare className="h-5 w-5" />,
      route: '/chat'
    },
    {
      title: "Earnings & Wallet",
      description: "View consultations revenue and payouts",
      icon: <Wallet className="h-5 w-5" />,
      route: '/wallet'
    },
    {
      title: "Emergency Protocols",
      description: "Emergency response tools",
      icon: <AlertTriangle className="h-5 w-5" />,
      route: '/emergency'
    },
    {
      title: "Professional Profile",
      description: "Credentials, specializations & bio",
      icon: <Stethoscope className="h-5 w-5" />,
      route: '/profile'
    },
    {
      title: "Settings",
      description: "Configure practice preferences",
      icon: <Settings className="h-5 w-5" />,
      route: '/settings'
    }
  ];

  return (
    <div className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      <ApplicationStatusBanner />
      <ProfileCompleteBanner />
      <div className="text-center space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Healthcare Provider Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base px-4">
          Manage your practice, patients, and consultations
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border"
            onClick={() => handleNavigation(step.route, step.title)}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg flex-shrink-0">
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
                onClick={(e) => { e.stopPropagation(); handleNavigation(step.route, step.title); }}
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
