
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, MessageSquare, User, FileText, CreditCard } from 'lucide-react';

export const PatientWorkflow = () => {
  const navigate = useNavigate();

  const workflowSteps = [
    {
      title: "Complete Profile",
      description: "Set up your medical profile and preferences",
      icon: <User className="h-5 w-5" />,
      action: () => navigate('/profile-setup'),
      completed: false
    },
    {
      title: "Symptom Assessment", 
      description: "Describe your symptoms to get recommendations",
      icon: <FileText className="h-5 w-5" />,
      action: () => navigate('/symptoms'),
      completed: false
    },
    {
      title: "Find Providers",
      description: "Search for healthcare providers in your area",
      icon: <Search className="h-5 w-5" />,
      action: () => navigate('/search'),
      completed: false
    },
    {
      title: "Book Appointment",
      description: "Schedule an appointment with a provider",
      icon: <Calendar className="h-5 w-5" />,
      action: () => navigate('/appointments'),
      completed: false
    },
    {
      title: "Manage Payments",
      description: "Add payment methods and manage billing",
      icon: <CreditCard className="h-5 w-5" />,
      action: () => navigate('/payments'),
      completed: false
    },
    {
      title: "Communicate",
      description: "Chat with your healthcare providers",
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => navigate('/chat'),
      completed: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Patient Journey</h2>
        <p className="text-muted-foreground mt-2">
          Follow these steps to get the most out of your healthcare experience
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflowSteps.map((step, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {step.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">{step.title}</CardTitle>
                  <div className="text-xs text-muted-foreground">Step {index + 1}</div>
                </div>
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
                {step.completed ? "Review" : "Start"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
