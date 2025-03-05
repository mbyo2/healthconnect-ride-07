
import React, { createContext, useContext, useState, useEffect } from 'react';

type AccessibilityContextType = {
  screenReaderAnnounce: (message: string, assertive?: boolean) => void;
  skipToContent: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Function to make announcements to screen readers
  const screenReaderAnnounce = (message: string, assertive = true) => {
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
  };
  
  // Function to skip to main content
  const skipToContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.tabIndex = -1;
      mainContent.focus();
      screenReaderAnnounce('Skipped to main content');
    }
  };
  
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
        screenReaderAnnounce(
          'Keyboard shortcuts: Alt+1 to skip to main content, Alt+2 for keyboard shortcuts help',
          true
        );
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <AccessibilityContext.Provider value={{ screenReaderAnnounce, skipToContent }}>
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
