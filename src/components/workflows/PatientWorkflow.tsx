
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
import { SpecializedHelp } from "@/components/home/SpecializedHelp";
import { WalletCard } from "@/components/home/WalletCard";

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
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-8 md:py-12 rounded-3xl shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

          <div className="relative px-6 md:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-100" />
                  <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-50">Welcome back!</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Your Health Dashboard
                </h1>
                <p className="text-blue-100/90 text-sm md:text-base max-w-md">
                  Everything looks good! You're all set to manage your health journey.
                </p>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 hover:border-white/40 w-full sm:w-auto font-bold shadow-lg transition-all active:scale-95"
                onClick={() => handleNavigation('/emergency', 'Emergency Help')}
              >
                <div className="mr-2 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
                Emergency Help
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div>
          <h2 className="text-xl font-bold mb-4 px-1">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/emergency', 'Emergency')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
                    <Activity className="h-5 w-5 text-rose-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Emergency</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs font-medium">Get help now</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/marketplace', 'Pharmacy')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Buy Medicine</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs font-medium">Order online</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/marketplace-users', 'Providers')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Find Doctor</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs font-medium">Book visits</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-sm bg-white hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/appointments', 'Appointments')}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                  <CardTitle className="text-sm font-bold">Visits</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs font-medium">My schedule</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Specialized Help & Wallet */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <h2 className="text-lg font-bold mb-3 text-gray-800">Specialized Care</h2>
              <SpecializedHelp />
            </section>
          </div>
          <div className="lg:col-span-1">
            <WalletCard />
          </div>
        </div>
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
