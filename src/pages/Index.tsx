
import { useState, useEffect } from "react";
import { SymptomCollector } from "@/components/SymptomCollector";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { MobileTouchList } from "@/components/MobileTouchList";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useRoleDashboard } from "@/hooks/useRoleDashboard";
import { LoadingScreen } from "@/components/LoadingScreen";

export const Index = () => {
  const navigate = useNavigate();
  const { showFeatureHighlight } = useOnboarding();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Automatically redirect authenticated users to their role-based dashboard
  const { isLoading, shouldRedirect } = useRoleDashboard({ redirectOnAuth: true });
  
  // Show loading while checking authentication and roles
  if (isLoading || shouldRedirect) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }
  
  const handleSymptomSubmit = (symptoms: string, urgency: string) => {
    console.log("Symptoms submitted:", { symptoms, urgency });
    toast.success("Symptoms recorded successfully");
  };

  useEffect(() => {
    // Show feature highlights with slight delays between them
    setTimeout(() => {
      showFeatureHighlight({
        id: "home-symptoms",
        targetSelector: ".symptom-collector",
        title: "Report Your Symptoms",
        description: "Track your health by recording symptoms. Your doctor will have this information during appointments.",
        position: "bottom",
        showDelay: 800
      });
    }, 2000);
    
    setTimeout(() => {
      showFeatureHighlight({
        id: "home-find-care",
        targetSelector: ".find-care-button",
        title: "Find Healthcare",
        description: "Search for doctors and specialists based on your location and needs.",
        position: "left",
        showDelay: 500
      });
    }, 4000);
  }, [showFeatureHighlight]);

  // Quick action buttons with enhanced mobile touch support
  const quickActions = [
    {
      label: "Find Healthcare Providers",
      icon: <ArrowRight size={16} />,
      action: () => navigate('/search'),
      className: "find-care-button"
    },
    {
      label: "Manage Appointments",
      icon: <ArrowRight size={16} />,
      action: () => navigate('/appointments')
    },
    {
      label: "Video Consultations",
      icon: <ArrowRight size={16} />,
      action: () => navigate('/video-consultation')
    },
    {
      label: "Update Profile",
      icon: <ArrowRight size={16} />,
      action: () => navigate('/profile')
    }
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 py-10 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Your Health Portal</h1>
        <p className="text-muted-foreground mt-2">Track symptoms, find healthcare providers, and manage appointments all in one place</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card rounded-lg shadow-sm p-6 border symptom-collector">
          <h2 className="text-xl font-semibold mb-4">Report Symptoms</h2>
          <SymptomCollector onSymptomSubmit={handleSymptomSubmit} />
        </div>
        
        <div className="bg-card rounded-lg shadow-sm p-6 border space-y-6">
          <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {isMobile ? (
              <MobileTouchList 
                onItemClick={(index) => quickActions[index].action()}
                enableSwipe={true}
                className="space-y-4"
                itemClassName="touch-manipulation active:bg-accent/20"
              >
                {quickActions.map((action, index) => (
                  <Button 
                    key={index}
                    className={`justify-between w-full ${action.className || ""}`}
                    variant="outline"
                  >
                    {action.label}
                    {action.icon}
                  </Button>
                ))}
              </MobileTouchList>
            ) : (
              quickActions.map((action, index) => (
                <Button 
                  key={index}
                  onClick={action.action}
                  className={`justify-between ${action.className || ""}`}
                  variant="outline"
                >
                  {action.label}
                  {action.icon}
                </Button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
