
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

export const LoadingScreen = ({ 
  message = "Preparing Doc' O Clock for emergency healthcare...", 
  timeout = 6000 // Extended for emergency system reliability
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
    "Preparing emergency response protocols...",
    "Loading healthcare databases...",
    "Establishing secure communications...",
    "Doc' O Clock emergency system ready"
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
    }, timeout * 3);
    
    // Slower, more deliberate progress for emergency systems
    const progressInterval = setInterval(() => {
      if (mounted) {
        setLoadingProgress(prev => {
          const increment = Math.random() * 6; // Slower progress
          return Math.min(prev + increment, 92);
        });
      }
    }, 500);
    
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
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-8 animate-fadeIn p-10 rounded-2xl bg-white shadow-2xl border border-gray-200 max-w-lg text-center">
        
        {/* Modern Doc' O Clock Logo */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              D0C
            </div>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl blur opacity-20"></div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Doc' O Clock
            </h1>
            <p className="text-sm text-gray-500 font-medium">Emergency Healthcare System</p>
          </div>
        </div>
        
        {/* Modern Loading Spinner */}
        <div className="relative">
          <LoadingSpinner size="lg" className="text-blue-500" />
          <div className="absolute inset-0 animate-ping">
            <LoadingSpinner size="lg" className="text-blue-300 opacity-30" />
          </div>
        </div>
        
        {/* Status Messages */}
        <div className="space-y-3">
          <p className="text-lg font-semibold text-gray-800">{currentMessage}</p>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        
        {/* Modern Progress Bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Loading...</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm" 
              style={{ width: `${loadingProgress}%` }} 
            />
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${loadingFailed ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
          <p className="text-sm font-medium text-gray-600">
            {loadingFailed 
              ? "System initialization failed" 
              : "Emergency healthcare system initializing..."}
          </p>
        </div>
        
        {/* Action Buttons */}
        {(showFallback || loadingFailed) && (
          <div className="mt-6 text-center space-y-4 w-full">
            <p className="text-sm text-gray-600">
              {loadingFailed 
                ? "Emergency system could not initialize. Please refresh or reset."
                : longWait 
                  ? "System initialization taking longer than expected."
                  : "Taking longer to ensure emergency readiness."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleRefresh}
                variant={loadingFailed ? "amazon" : "outline"}
                size="lg"
                className="min-w-[120px]"
              >
                Refresh System
              </Button>
              
              {(longWait || loadingFailed) && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleClearCacheAndReload}
                  className="min-w-[120px]"
                >
                  Emergency Reset
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Trust indicators at bottom */}
      <div className="absolute bottom-8 flex items-center gap-6 text-sm text-gray-500">
        <span>🔒 HIPAA Compliant</span>
        <span>✓ Emergency Ready</span>
        <span>⚡ 99.9% Uptime</span>
      </div>
    </div>
  );
};
