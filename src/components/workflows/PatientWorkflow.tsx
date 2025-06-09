
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
  User,
  CheckCircle2,
  Circle,
  Shield,
  Activity,
  Sparkles
} from 'lucide-react';

const getIcon = (iconName: string) => {
  const icons = {
    User,
    Activity,
    Search,
    Calendar,
    Heart,
    Shield
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
    nextStep,
    isWorkflowComplete
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

        {/* Quick Actions for Completed Setup */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/appointments')}
              >
                <Calendar className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Book Appointment</div>
                  <div className="text-xs text-muted-foreground">Schedule with providers</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/dashboard?tab=symptoms')}
              >
                <Activity className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Track Health</div>
                  <div className="text-xs text-muted-foreground">Log symptoms & metrics</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/search')}
              >
                <Search className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Find Providers</div>
                  <div className="text-xs text-muted-foreground">Discover specialists</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/health-dashboard')}
              >
                <Heart className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Health Dashboard</div>
                  <div className="text-xs text-muted-foreground">View your progress</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/dashboard?tab=insurance')}
              >
                <Shield className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Insurance Info</div>
                  <div className="text-xs text-muted-foreground">Manage coverage</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-start gap-2 h-auto py-4"
                onClick={() => navigate('/wallet?tab=payment-methods')}
              >
                <Heart className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Payment Methods</div>
                  <div className="text-xs text-muted-foreground">Manage payments</div>
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
        
        {/* Progress Overview */}
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflowSteps.map((step, index) => {
          const IconComponent = getIcon(step.icon);
          const isHighlighted = step.id === nextStep?.id;
          
          return (
            <Card 
              key={step.id} 
              className={`cursor-pointer hover:shadow-md transition-all ${
                step.completed ? 'border-green-200 bg-green-50/50' : ''
              } ${
                isHighlighted ? 'border-blue-200 bg-blue-50/50 ring-2 ring-blue-100' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-lg ${
                      step.completed ? 'bg-green-500/10' : 
                      isHighlighted ? 'bg-blue-500/10' : 'bg-gray-500/10'
                    }`}>
                      <IconComponent className={`h-4 w-4 ${
                        step.completed ? 'text-green-600' : 
                        isHighlighted ? 'text-blue-600' : 'text-gray-600'
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
                {isHighlighted && (
                  <Badge variant="outline" className="w-fit text-xs border-blue-300 text-blue-700">
                    Next Step
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
    </div>
  );
};
