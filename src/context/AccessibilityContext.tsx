
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type AccessibilityContextType = {
  screenReaderAnnounce: (message: string, assertive?: boolean) => void;
  skipToContent: () => void;
  isScreenReaderEnabled: boolean;
  setScreenReaderEnabled: (enabled: boolean) => void;
  speakContent: (message: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  // Detect screen reader
  useEffect(() => {
    // Try to detect if a screen reader is present
    const detectScreenReader = () => {
      if (document.getElementById('__nvda_speech_output')) {
        setScreenReaderEnabled(true);
        return;
      }
      
      // Add a hidden element with aria-live that screen readers might interact with
      const probe = document.createElement('div');
      probe.setAttribute('id', 'screen-reader-detector');
      probe.setAttribute('aria-live', 'assertive');
      probe.setAttribute('class', 'sr-only');
      document.body.appendChild(probe);
      
      // Set content after a delay
      setTimeout(() => {
        probe.textContent = 'Screen reader detection';
        // If using VoiceOver, JAWS, etc. they might interact with this element
      }, 500);
      
      // Cleanup after detection attempt
      setTimeout(() => {
        document.body.removeChild(probe);
      }, 2000);
    };
    
    detectScreenReader();
    
    // Also check for common keyboard shortcuts that screen reader users use
    const handleKeyDown = (e: KeyboardEvent) => {
      // Various screen reader keyboard shortcuts
      if ((e.key === 'Insert' && e.altKey) || // JAWS
          (e.key === 'CapsLock' && e.altKey) || // NVDA
          (e.key === 'F5' && e.ctrlKey && e.altKey)) { // VoiceOver
        setScreenReaderEnabled(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Function to make announcements to screen readers
  const screenReaderAnnounce = useCallback((message: string, assertive = true) => {
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    document.body.appendChild(announcement);
    
    // This forces screen readers to recognize the new content
    setTimeout(() => {
      announcement.textContent = message;
    }, 100);
    
    // Remove the element after it's been announced
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);
  
  // Function to speak content using the Web Speech API
  const speakContent = useCallback((message: string) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, []);
  
  // Function to stop ongoing speech
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);
  
  // Function to skip to main content
  const skipToContent = useCallback(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.tabIndex = -1;
      mainContent.focus();
      screenReaderAnnounce('Skipped to main content');
      
      // Also provide audible feedback
      if (isScreenReaderEnabled) {
        speakContent('Skipped to main content');
      }
    }
  }, [screenReaderAnnounce, speakContent, isScreenReaderEnabled]);
  
  // Add keyboard navigation listener for common accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1: Skip to main content
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        skipToContent();
      }
      
      // Alt+2: Announce available shortcuts
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        const message = 'Keyboard shortcuts: Alt+1 to skip to main content, Alt+2 for keyboard shortcuts help, Alt+3 to toggle screen reader.';
        screenReaderAnnounce(message, true);
        
        // Also provide audible feedback
        speakContent(message);
      }
      
      // Alt+3: Toggle screen reader simulation
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setScreenReaderEnabled(prev => !prev);
        const message = isScreenReaderEnabled 
          ? 'Screen reader mode disabled' 
          : 'Screen reader mode enabled';
        
        screenReaderAnnounce(message, true);
        speakContent(message);
      }
      
      // Escape: Stop speaking
      if (e.key === 'Escape' && isSpeaking) {
        e.preventDefault();
        stopSpeaking();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipToContent, screenReaderAnnounce, speakContent, isScreenReaderEnabled, isSpeaking, stopSpeaking]);
  
  return (
    <AccessibilityContext.Provider 
      value={{ 
        screenReaderAnnounce, 
        skipToContent, 
        isScreenReaderEnabled, 
        setScreenReaderEnabled,
        speakContent,
        isSpeaking,
        stopSpeaking
      }}
    >
      {/* Skip to content link - visible on focus */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground focus:left-0 focus:top-0 focus:w-auto focus:h-auto"
        onClick={(e) => {
          e.preventDefault();
          skipToContent();
        }}
      >
        Skip to content
      </a>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
