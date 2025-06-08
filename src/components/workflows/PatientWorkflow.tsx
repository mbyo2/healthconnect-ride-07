
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { 
  Heart, 
  Search, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Settings,
  Activity,
  User,
  CheckCircle2,
  Circle
} from 'lucide-react';

const getIcon = (iconName: string) => {
  const icons = {
    User,
    Activity,
    Search,
    Calendar,
    MessageSquare,
    FileText,
    Heart,
    Settings
  };
  return icons[iconName as keyof typeof icons] || Circle;
};

export const PatientWorkflow = () => {
  const navigate = useNavigate();
  const { 
    isProfileComplete, 
    workflowSteps, 
    loading, 
    completionPercentage, 
    nextStep 
  } = useProfileCompletion();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading Your Health Journey...</h2>
        </div>
      </div>
    );
  }

  const getButtonText = (step: any) => {
    if (step.id === 'profile') {
      return isProfileComplete ? 'Edit Profile' : 'Complete Profile';
    }
    return step.completed ? 'View' : 'Start';
  };

  const getButtonVariant = (step: any) => {
    if (step.id === 'profile' && !isProfileComplete) {
      return 'default'; // Highlight the profile completion
    }
    return step.completed ? 'outline' : 'default';
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Your Health Journey</h2>
        <p className="text-muted-foreground">
          Take control of your health with our comprehensive healthcare platform
        </p>
        
        {/* Progress Overview */}
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          {nextStep && (
            <p className="text-xs text-muted-foreground">
              Next: {nextStep.title}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => {
          const IconComponent = getIcon(step.icon);
          
          return (
            <Card 
              key={step.id} 
              className={`cursor-pointer hover:shadow-md transition-all ${
                step.completed ? 'border-green-200 bg-green-50/50' : ''
              } ${
                step.id === 'profile' && !isProfileComplete ? 'border-blue-200 bg-blue-50/50' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      step.completed ? 'bg-green-500/10' : 'bg-blue-500/10'
                    }`}>
                      <IconComponent className={`h-4 w-4 ${
                        step.completed ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <CardTitle className="text-sm">{step.title}</CardTitle>
                  </div>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                {step.required && !step.completed && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    Required
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-3">
                  {step.description}
                </CardDescription>
                <Button 
                  onClick={() => navigate(step.route)}
                  size="sm" 
                  className="w-full"
                  variant={getButtonVariant(step)}
                >
                  {getButtonText(step)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions for Completed Profile */}
      {isProfileComplete && (
        <Card className="p-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to maintain your health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-3"
                onClick={() => navigate('/appointments')}
              >
                <Calendar className="h-4 w-4" />
                <span>Book Appointment</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-3"
                onClick={() => navigate('/symptoms')}
              >
                <Activity className="h-4 w-4" />
                <span>Log Symptoms</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-3"
                onClick={() => navigate('/search')}
              >
                <Search className="h-4 w-4" />
                <span>Find Provider</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
