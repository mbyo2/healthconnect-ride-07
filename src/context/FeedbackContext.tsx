import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useFeedbackSystem, FeedbackOptions } from '@/hooks/use-feedback-system';

interface FeedbackContextType {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  playSuccessSound: () => Promise<void>;
  playErrorSound: () => Promise<void>;
  triggerHaptics: (type?: 'light' | 'medium' | 'heavy') => void;
  settings: FeedbackOptions;
  updateSettings: (newSettings: Partial<FeedbackOptions>) => void;
  isPlaying: boolean;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

interface FeedbackProviderProps {
  children: ReactNode;
  defaultSettings?: FeedbackOptions;
}

export function FeedbackProvider({ children, defaultSettings }: FeedbackProviderProps) {
  const [settings, setSettings] = useState<FeedbackOptions>({
    enableSound: true,
    enableHaptics: true,
    enableVisual: true,
    soundVolume: 0.5,
    ...defaultSettings
  });

  const {
    showSuccess,
    showError,
    playSuccessSound,
    playErrorSound,
    triggerHaptics,
    initialize,
    isPlaying
  } = useFeedbackSystem(settings);

  const updateSettings = (newSettings: Partial<FeedbackOptions>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Initialize on mount
  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const value: FeedbackContextType = {
    showSuccess,
    showError,
    playSuccessSound,
    playErrorSound,
    triggerHaptics,
    settings,
    updateSettings,
    isPlaying
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}
