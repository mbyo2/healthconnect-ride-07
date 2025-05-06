
import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { OnboardingTour } from './OnboardingTour';
import { FeatureHighlight } from './FeatureHighlight';

interface OnboardingContextType {
  showFeatureHighlight: (feature: FeatureHighlightProps) => void;
  completeOnboarding: () => void;
  hasCompletedOnboarding: boolean;
  completedFeatures: string[];
  markFeatureAsCompleted: (featureId: string) => void;
}

interface FeatureHighlightProps {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  showDelay?: number;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [activeFeatureHighlight, setActiveFeatureHighlight] = useState<FeatureHighlightProps | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(
    localStorage.getItem('hasCompletedOnboarding') === 'true'
  );
  const [completedFeatures, setCompletedFeatures] = useState<string[]>(
    JSON.parse(localStorage.getItem('completedFeatures') || '[]')
  );
  const location = useLocation();

  useEffect(() => {
    // Clear active highlight when route changes
    setActiveFeatureHighlight(null);
  }, [location.pathname]);

  const showFeatureHighlight = (feature: FeatureHighlightProps) => {
    // Only show if this feature hasn't been completed
    if (!completedFeatures.includes(feature.id)) {
      setActiveFeatureHighlight(feature);
    }
  };

  const markFeatureAsCompleted = (featureId: string) => {
    if (!completedFeatures.includes(featureId)) {
      const updatedFeatures = [...completedFeatures, featureId];
      setCompletedFeatures(updatedFeatures);
      localStorage.setItem('completedFeatures', JSON.stringify(updatedFeatures));
    }
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('hasCompletedOnboarding', 'true');
  };

  const dismissFeatureHighlight = () => {
    if (activeFeatureHighlight) {
      markFeatureAsCompleted(activeFeatureHighlight.id);
      setActiveFeatureHighlight(null);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        showFeatureHighlight,
        completeOnboarding,
        hasCompletedOnboarding,
        completedFeatures,
        markFeatureAsCompleted,
      }}
    >
      {!hasCompletedOnboarding && <OnboardingTour onComplete={completeOnboarding} />}
      
      {activeFeatureHighlight && (
        <FeatureHighlight
          targetSelector={activeFeatureHighlight.targetSelector}
          title={activeFeatureHighlight.title}
          description={activeFeatureHighlight.description}
          position={activeFeatureHighlight.position}
          showDelay={activeFeatureHighlight.showDelay}
          onDismiss={dismissFeatureHighlight}
        />
      )}
      
      {children}
    </OnboardingContext.Provider>
  );
}
