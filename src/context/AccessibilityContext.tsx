import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeLocalGet, safeLocalSet } from '@/utils/storage';

type AccessibilityPreferences = {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
};

type AccessibilityContextType = {
  screenReaderAnnounce: (message: string, assertive?: boolean) => void;
  skipToContent: () => void;
  isScreenReaderEnabled: boolean;
  setScreenReaderEnabled: (enabled: boolean) => void;
  speakContent: (message: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  increaseTextSize: () => void;
  decreaseTextSize: () => void;
  resetTextSize: () => void;
  textSize: number;
  enableEasyReading: () => void;
  disableEasyReading: () => void;
  isEasyReadingEnabled: boolean;
  preferences: AccessibilityPreferences;
  updatePreferences: (prefs: Partial<AccessibilityPreferences>) => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isScreenReaderEnabled, setScreenReaderEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [textSize, setTextSize] = useState<number>(
    parseFloat((safeLocalGet('accessibility_text_size') as string) || '1')
  );
  const [isEasyReadingEnabled, setIsEasyReadingEnabled] = useState<boolean>(
    safeLocalGet('accessibility_easy_reading') === 'true'
  );
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    highContrast: safeLocalGet('accessibility_high_contrast') === 'true',
    largeText: safeLocalGet('accessibility_large_text') === 'true',
    reducedMotion: safeLocalGet('accessibility_reduced_motion') === 'true',
    screenReader: safeLocalGet('accessibility_screen_reader') === 'true'
  });
  
  // Apply stored settings on load
  useEffect(() => {
    applyTextSize(textSize);
    if (isEasyReadingEnabled) {
      document.documentElement.classList.add('easy-reading');
    }
  }, [textSize, isEasyReadingEnabled]);
  
  // Text size controls
  const increaseTextSize = useCallback(() => {
    const newSize = Math.min(textSize + 0.1, 1.5);
    setTextSize(newSize);
    safeLocalSet('accessibility_text_size', newSize.toString());
    applyTextSize(newSize);
  }, [textSize]);
  
  const decreaseTextSize = useCallback(() => {
    const newSize = Math.max(textSize - 0.1, 0.8);
    setTextSize(newSize);
    safeLocalSet('accessibility_text_size', newSize.toString());
    applyTextSize(newSize);
  }, [textSize]);
  
  const resetTextSize = useCallback(() => {
    setTextSize(1);
    safeLocalSet('accessibility_text_size', '1');
    applyTextSize(1);
  }, []);
  
  const applyTextSize = (size: number) => {
    document.documentElement.style.fontSize = `${size * 100}%`;
  };
  
  // Easy reading mode for sick patients
  const enableEasyReading = useCallback(() => {
    setIsEasyReadingEnabled(true);
    safeLocalSet('accessibility_easy_reading', 'true');
    document.documentElement.classList.add('easy-reading');
  }, []);
  
  const disableEasyReading = useCallback(() => {
    setIsEasyReadingEnabled(false);
    safeLocalSet('accessibility_easy_reading', 'false');
    document.documentElement.classList.remove('easy-reading');
  }, []);

  // Update preferences function
  const updatePreferences = useCallback((newPrefs: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      
      // Save to localStorage
      Object.entries(updated).forEach(([key, value]) => {
        safeLocalSet(`accessibility_${key.toLowerCase()}`, value.toString());
      });
      
      return updated;
    });
  }, []);
  
  // Apply easy reading styles
  useEffect(() => {
    if (isEasyReadingEnabled) {
      const style = document.createElement('style');
      style.id = 'easy-reading-styles';
      style.textContent = `
        .easy-reading {
          --letter-spacing: 0.03em;
          --line-height: 1.6;
        }
        .easy-reading p, 
        .easy-reading span,
        .easy-reading div,
        .easy-reading button {
          letter-spacing: var(--letter-spacing);
          line-height: var(--line-height);
        }
        .easy-reading button,
        .easy-reading a {
          min-height: 48px;
          min-width: 48px;
        }
        .easy-reading input,
        .easy-reading select,
        .easy-reading textarea {
          font-size: 1.1em;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const styleElement = document.getElementById('easy-reading-styles');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
      };
    }
  }, [isEasyReadingEnabled]);

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
    utterance.rate = 0.9; // Slightly slower for better understanding
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
      
      // Alt+ and Alt- for text size
      if (e.altKey && e.key === '=') {
        e.preventDefault();
        increaseTextSize();
        screenReaderAnnounce('Text size increased', false);
      }
      
      if (e.altKey && e.key === '-') {
        e.preventDefault();
        decreaseTextSize();
        screenReaderAnnounce('Text size decreased', false);
      }
      
      // Alt+R for easy reading mode
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        if (isEasyReadingEnabled) {
          disableEasyReading();
          screenReaderAnnounce('Easy reading mode disabled', false);
        } else {
          enableEasyReading();
          screenReaderAnnounce('Easy reading mode enabled', false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skipToContent, screenReaderAnnounce, speakContent, isScreenReaderEnabled, isSpeaking, stopSpeaking, increaseTextSize, decreaseTextSize, isEasyReadingEnabled, enableEasyReading, disableEasyReading]);
  
  return (
    <AccessibilityContext.Provider 
      value={{ 
        screenReaderAnnounce, 
        skipToContent, 
        isScreenReaderEnabled, 
        setScreenReaderEnabled,
        speakContent,
        isSpeaking,
        stopSpeaking,
        increaseTextSize,
        decreaseTextSize,
        resetTextSize,
        textSize,
        enableEasyReading,
        disableEasyReading,
        isEasyReadingEnabled,
        preferences,
        updatePreferences
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
