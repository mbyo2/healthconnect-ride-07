
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Home,
  Calendar,
  MessageSquare,
  Video,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';

interface TourStep {
  title: string;
  description: string;
  element?: string;
  image?: string;
  route?: string;
  icon?: React.ReactNode;
}

export function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  const navigate = useNavigate();
  
  const tourSteps: TourStep[] = [
    {
      title: "Welcome to HealthConnect",
      description: "Let's take a quick tour to help you get started with the app. We'll show you the main features so you can make the most of your healthcare experience.",
      image: "placeholder.svg",
      icon: <Home className="h-12 w-12 text-primary mb-4" />,
    },
    {
      title: "Find Healthcare Providers",
      description: "Search for doctors, specialists, and healthcare facilities near you. Filter by specialty, location, and availability.",
      route: "/search",
      icon: <User className="h-12 w-12 text-primary mb-4" />,
    },
    {
      title: "Manage Appointments",
      description: "Schedule, reschedule, or cancel appointments directly from the app. Get reminders and view your upcoming visits.",
      route: "/appointments",
      icon: <Calendar className="h-12 w-12 text-primary mb-4" />,
    },
    {
      title: "Video Consultations",
      description: "Connect with healthcare providers through secure video calls. Access care from anywhere, anytime.",
      route: "/video-consultation",
      icon: <Video className="h-12 w-12 text-primary mb-4" />,
    },
    {
      title: "Chat with Providers",
      description: "Message your healthcare team securely. Ask questions, share updates, and get quick responses.",
      route: "/chat",
      icon: <MessageSquare className="h-12 w-12 text-primary mb-4" />,
    },
    {
      title: "You're All Set!",
      description: "Thanks for exploring HealthConnect! You can always find this tour again in your profile settings.",
      icon: <Home className="h-12 w-12 text-primary mb-4" />,
    },
  ];

  useEffect(() => {
    // Check if user has seen the tour before
    const hasSeenTour = localStorage.getItem('hasCompletedOnboarding');
    if (!hasSeenTour) {
      // Delay opening to allow page to load fully
      const timer = setTimeout(() => {
        setOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      // If the next step has a route, navigate to it first
      if (tourSteps[currentStep + 1].route && location.pathname !== tourSteps[currentStep + 1].route) {
        navigate(tourSteps[currentStep + 1].route!);
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      // If the previous step has a route, navigate to it
      if (tourSteps[currentStep - 1].route && location.pathname !== tourSteps[currentStep - 1].route) {
        navigate(tourSteps[currentStep - 1].route!);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setOpen(false);
    localStorage.setItem('hasCompletedOnboarding', 'true');
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    // Return to home if not on home already
    if (location.pathname !== '/') {
      navigate('/');
    }
    handleComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={`sm:max-w-lg p-0 gap-0 ${isMobile ? 'h-[80vh]' : ''}`}>
        {/* Progress indicator */}
        <div className="flex w-full h-1.5 bg-secondary">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-full transition-all duration-300 ${
                index <= currentStep ? 'bg-primary' : 'bg-secondary'
              }`}
              style={{ width: `${100 / tourSteps.length}%` }}
            />
          ))}
        </div>
        
        <div className="p-6 flex flex-col h-full">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-full p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-4">
            {/* Icon for the step */}
            <div className="flex items-center justify-center">
              {tourSteps[currentStep].icon}
            </div>
            
            <h2 className="text-xl font-semibold">
              {tourSteps[currentStep].title}
            </h2>
            
            <p className="text-muted-foreground text-sm md:text-base">
              {tourSteps[currentStep].description}
            </p>
            
            {tourSteps[currentStep].image && (
              <div className="my-4 rounded-lg overflow-hidden border shadow-sm max-w-xs mx-auto">
                <img
                  src={tourSteps[currentStep].image}
                  alt={tourSteps[currentStep].title}
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={handlePrevious}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            )}
            
            <Button onClick={handleNext}>
              {currentStep < tourSteps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
