
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Settings,
  Activity,
  User 
} from 'lucide-react';

export const PatientWorkflow = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    {
      title: "Complete Profile",
      description: "Set up your personal and medical information",
      icon: <User className="h-5 w-5" />,
      action: () => navigate('/profile'),
      completed: false
    },
    {
      title: "Report Symptoms",
      description: "Track your health by recording symptoms",
      icon: <Activity className="h-5 w-5" />,
      action: () => navigate('/symptoms'),
      completed: false
    },
    {
      title: "Find Healthcare",
      description: "Search for doctors and specialists near you",
      icon: <Search className="h-5 w-5" />,
      action: () => navigate('/search'),
      completed: false
    },
    {
      title: "Book Appointments",
      description: "Schedule appointments with healthcare providers",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/appointments'),
      completed: false
    },
    {
      title: "Chat with Providers",
      description: "Communicate with your healthcare team",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => navigate('/chat'),
      completed: false
    },
    {
      title: "Medical Records",
      description: "Access and manage your health records",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/medical-records'),
      completed: false
    },
    {
      title: "Health Dashboard",
      description: "View your health metrics and progress",
      icon: <Heart className="h-5 w-5" />,
      action: () => navigate('/health-dashboard'),
      completed: false
    },
    {
      title: "Account Settings",
      description: "Manage your account preferences",
      icon: <Settings className="h-5 w-5" />,
      action: () => navigate('/settings'),
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Your Health Journey</h2>
        <p className="text-muted-foreground mt-2">
          Take control of your health with our comprehensive healthcare platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
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
                {step.completed ? "View" : "Start"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
