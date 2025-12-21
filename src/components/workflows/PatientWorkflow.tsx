
import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useSuccessFeedback } from '@/hooks/use-success-feedback';
import {
  Heart,
  Search,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Shield,
  Activity,
  Sparkles,
  Video,
  CreditCard,
  Users
} from 'lucide-react';

const getIcon = (iconName: string) => {
  const icons = {
    User,
    Activity,
    Search,
    Calendar,
    Heart,
    Shield,
    Video,
    CreditCard,
    Users
  };
  return icons[iconName as keyof typeof icons] || Circle;
};

export const PatientWorkflow = React.memo(() => {
  const navigate = useNavigate();
  const { showSuccess } = useSuccessFeedback();
  const {
    isProfileComplete,
    workflowSteps,
    loading,
    completionPercentage,
    nextStep,
    isWorkflowComplete
  } = useProfileCompletion();

  const handleNavigation = useCallback((route: string, title?: string) => {
    try {
      navigate(route);
      if (title) {
        showSuccess({ message: `Opening ${title}...` });
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate, showSuccess]);

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
      return 'default';
    }
    return step.completed ? 'outline' : 'default';
  };

  // Show completion message if all required steps are done
  if (isWorkflowComplete) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">🎉 Welcome to Your Health Journey!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Great job! You've completed the essential setup. Now you can take full advantage of all our healthcare features.
          </p>

          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </div>

        <Card className="p-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">What's Next?</CardTitle>
            </div>
            <CardDescription>
              Explore these popular features to get the most out of your healthcare experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-3 text-left hover:bg-accent hover:shadow-sm transition-all active:scale-95"
                onClick={() => handleNavigation('/connections', 'Connect with Providers')}
              >
                <div className="flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs">Connect Providers</div>
                  <div className="text-xs text-muted-foreground leading-tight">Build network</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-3 text-left hover:bg-accent hover:shadow-sm transition-all active:scale-95"
                onClick={() => handleNavigation('/appointments')}
              >
                <div className="flex-shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs">Book Appointment</div>
                  <div className="text-xs text-muted-foreground leading-tight">Schedule care</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-3 text-left hover:bg-accent hover:shadow-sm transition-all active:scale-95"
                onClick={() => handleNavigation('/video-dashboard')}
              >
                <div className="flex-shrink-0">
                  <Video className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs">Video Consult</div>
                  <div className="text-xs text-muted-foreground leading-tight">Video calls</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-3 h-auto p-3 text-left hover:bg-accent hover:shadow-sm transition-all active:scale-95"
                onClick={() => handleNavigation('/symptoms')}
              >
                <div className="flex-shrink-0">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs">Track Health</div>
                  <div className="text-xs text-muted-foreground leading-tight">Log symptoms</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Your Health Journey</h2>
        <p className="text-muted-foreground">
          Complete these steps to unlock the full potential of your healthcare experience
        </p>

        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Setup Progress</span>
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {workflowSteps.map((step, index) => {
          const IconComponent = getIcon(step.icon);
          const isHighlighted = step.id === nextStep?.id;

          return (
            <Card
              key={step.id}
              className={`cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation ${step.completed ? 'border-green-200 bg-green-50/50' : ''
                } ${isHighlighted ? 'border-blue-200 bg-blue-50/50 ring-2 ring-blue-100' : ''
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${step.completed ? 'bg-green-500/10' :
                      isHighlighted ? 'bg-blue-500/10' : 'bg-gray-500/10'
                      }`}>
                      <IconComponent className={`h-4 w-4 ${step.completed ? 'text-green-600' :
                        isHighlighted ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                    </div>
                    <CardTitle className="text-sm leading-tight">{step.title}</CardTitle>
                  </div>
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                {step.required && !step.completed && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    Required
                  </Badge>
                )}
                {isHighlighted && (
                  <Badge variant="outline" className="w-fit text-xs border-blue-300 text-blue-700">
                    Next Step
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs mb-4 leading-relaxed">
                  {step.description}
                </CardDescription>
                <Button
                  onClick={() => handleNavigation(step.route, step.title)}
                  size="sm"
                  className="w-full hover:shadow-sm transition-all active:scale-95 touch-manipulation"
                  variant={getButtonVariant(step)}
                >
                  {getButtonText(step)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

PatientWorkflow.displayName = 'PatientWorkflow';
