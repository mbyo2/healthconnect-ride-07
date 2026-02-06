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
  Users,
  Phone,
  Pill,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { SpecializedHelp } from "@/components/home/SpecializedHelp";
import { WalletCard } from "@/components/home/WalletCard";
import { ConnectedWorkflows } from "@/components/home/ConnectedWorkflows";
import { ZAMBIA_CONFIG } from '@/config/zambia';

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
          <h2 className="text-2xl font-bold text-foreground">Loading Your Health Journey...</h2>
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
      <div className="space-y-6 md:space-y-8">
        {/* Welcome Section - Zambian focused */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-6 md:py-10 rounded-2xl md:rounded-3xl shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl" />

          <div className="relative px-4 md:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-blue-100" />
                  <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-blue-50">Welcome back!</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                  Your Health Dashboard
                </h1>
                <p className="text-blue-100/90 text-sm md:text-base max-w-md">
                  Quality healthcare at your fingertips. Anywhere in Zambia. 🇿🇲
                </p>
              </div>
              <a
                href={`tel:${ZAMBIA_CONFIG.emergencyNumbers.ambulance}`}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-bold shadow-lg transition-all active:scale-95 w-full sm:w-auto justify-center"
              >
                <Phone className="h-4 w-4" />
                Emergency {ZAMBIA_CONFIG.emergencyNumbers.ambulance}
              </a>
            </div>
          </div>
        </div>

        {/* Quick Access Cards - Zambian context */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-4 px-1 text-foreground">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border shadow-sm bg-card hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/emergency', 'Emergency')}>
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-lg group-hover:bg-red-500/20 transition-colors">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-foreground">Emergency</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-[11px] sm:text-xs font-medium">Call 991</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border shadow-sm bg-card hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/marketplace', 'Pharmacy')}>
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Pill className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-foreground">Buy Medicine</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-[11px] sm:text-xs font-medium">Order online</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border shadow-sm bg-card hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/marketplace-users', 'Providers')}>
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-foreground">Find Doctor</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-[11px] sm:text-xs font-medium">Book visits</CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border border-border shadow-sm bg-card hover:-translate-y-1 active:scale-95" onClick={() => handleNavigation('/healthcare-institutions', 'Hospitals')}>
              <CardHeader className="pb-2 md:pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xs sm:text-sm font-bold text-foreground">Hospitals</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-[11px] sm:text-xs font-medium">UTH, Levy & more</CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Connected Workflows */}
        <ConnectedWorkflows />

        {/* Specialized Help & Wallet */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <section>
              <h2 className="text-base sm:text-lg font-bold mb-3 text-foreground">Specialized Care</h2>
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
        <h2 className="text-2xl font-bold text-foreground">Your Health Journey</h2>
        <p className="text-muted-foreground">
          Complete these steps to unlock the full potential of your healthcare experience
        </p>

        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Setup Progress</span>
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
              className={`cursor-pointer hover:shadow-md transition-all active:scale-95 touch-manipulation bg-card border-border ${step.completed ? 'border-green-500/30 bg-green-500/5' : ''
                } ${isHighlighted ? 'border-primary/30 bg-primary/5 ring-2 ring-primary/20' : ''
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${step.completed ? 'bg-green-500/10 dark:bg-green-500/20' :
                      isHighlighted ? 'bg-primary/10 dark:bg-primary/20' : 'bg-muted'
                      }`}>
                      <IconComponent className={`h-4 w-4 ${step.completed ? 'text-green-600 dark:text-green-400' :
                        isHighlighted ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                    </div>
                    <CardTitle className="text-sm leading-tight text-foreground">{step.title}</CardTitle>
                  </div>
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {step.required && !step.completed && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    Required
                  </Badge>
                )}
                {isHighlighted && (
                  <Badge variant="outline" className="w-fit text-xs border-primary/50 text-primary">
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
