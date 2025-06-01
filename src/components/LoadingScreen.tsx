
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

export const LoadingScreen = ({ 
  message = "Preparing Doc' O Clock for emergency care...", 
  timeout = 4000 // Increased timeout for emergency preparedness
}: LoadingScreenProps) => {
  const [showFallback, setShowFallback] = useState(false);
  const [longWait, setLongWait] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("Initializing emergency healthcare system...");
  
  // Emergency-focused loading messages
  const emergencyMessages = [
    "Initializing emergency healthcare system...",
    "Securing patient data connections...",
    "Verifying healthcare provider networks...",
    "Preparing emergency response tools...",
    "Doc' O Clock ready for emergency care"
  ];
  
  useEffect(() => {
    let mounted = true;
    let messageIndex = 0;
    
    // Cycle through emergency messages
    const messageInterval = setInterval(() => {
      if (mounted && messageIndex < emergencyMessages.length - 1) {
        messageIndex++;
        setCurrentMessage(emergencyMessages[messageIndex]);
      }
    }, 800);
    
    const fallbackTimer = setTimeout(() => {
      if (mounted) setShowFallback(true);
    }, timeout);
    
    const longWaitTimer = setTimeout(() => {
      if (mounted) setLongWait(true);
    }, timeout * 1.5);
    
    const failedTimer = setTimeout(() => {
      if (mounted) setLoadingFailed(true);
    }, timeout * 3); // Longer timeout for emergency systems
    
    // Slower, more deliberate progress for emergency systems
    const progressInterval = setInterval(() => {
      if (mounted) {
        setLoadingProgress(prev => {
          const increment = Math.random() * 8; // Slower progress
          return Math.min(prev + increment, 90);
        });
      }
    }, 400);
    
    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(longWaitTimer);
      clearTimeout(failedTimer);
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [timeout]);

  const handleRefresh = () => {
    sessionStorage.removeItem('auth-error');
    localStorage.removeItem('loading-error');
    window.location.reload();
  };

  const handleClearCacheAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-trust-50 to-trust-100 dark:from-trust-900 dark:to-background flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 animate-fadeIn p-8 rounded-xl bg-white/80 dark:bg-trust-800/80 backdrop-blur-sm shadow-lg max-w-md text-center border border-trust-200 dark:border-trust-700">
        
        {/* Doc' O Clock Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-trust-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            D0C
          </div>
          <h1 className="text-2xl font-bold text-trust-900 dark:text-trust-100">
            Doc' O Clock
          </h1>
        </div>
        
        <div className="relative">
          <LoadingSpinner size="lg" className="text-trust-500" />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-trust-700 dark:text-trust-300">{currentMessage}</p>
          <p className="text-sm text-trust-600 dark:text-trust-400">{message}</p>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-trust-200 dark:bg-trust-800 rounded-full h-3">
          <div 
            className="bg-trust-500 h-3 rounded-full transition-all duration-500" 
            style={{ width: `${loadingProgress}%` }} 
          />
        </div>
        
        <p className="text-sm text-trust-500 dark:text-trust-400 max-w-xs text-center">
          {loadingFailed 
            ? "Emergency system initialization failed" 
            : "Ensuring system reliability for emergency situations..."}
        </p>
        
        {(showFallback || loadingFailed) && (
          <div className="mt-4 text-center space-y-3">
            <p className="text-sm text-trust-600 dark:text-trust-400">
              {loadingFailed 
                ? "Emergency system could not initialize. Please refresh or clear cache."
                : longWait 
                  ? "Emergency system initialization taking longer than expected."
                  : "Taking longer to ensure emergency readiness. You can refresh if needed."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={handleRefresh}
                variant={loadingFailed ? "default" : "outline"}
                className="px-4 py-2"
              >
                Refresh System
              </Button>
              
              {(longWait || loadingFailed) && (
                <Button
                  variant="outline"
                  onClick={handleClearCacheAndReload}
                >
                  Emergency Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
