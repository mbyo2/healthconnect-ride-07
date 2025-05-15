
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface LoadingScreenProps {
  message?: string;
  timeout?: number; // Timeout in ms for showing fallback content
}

export const LoadingScreen = ({ 
  message = "Just a moment please...", 
  timeout = 2000 // Reduced from 3000 to 2000
}: LoadingScreenProps) => {
  const [showFallback, setShowFallback] = useState(false);
  const [longWait, setLongWait] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingFailed, setLoadingFailed] = useState(false);
  
  // Show fallback content if loading takes too long
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, timeout); // Show fallback message after timeout
    
    const longWaitTimer = setTimeout(() => {
      setLongWait(true);
    }, timeout * 1.5); // Reduced multiplier
    
    const failedTimer = setTimeout(() => {
      setLoadingFailed(true);
    }, timeout * 3); // Consider loading failed after 3x timeout
    
    // Create a simulated loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const increment = Math.random() * 15;
        return Math.min(prev + increment, 95); // Cap at 95% until actually loaded
      });
    }, 400);
    
    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(longWaitTimer);
      clearTimeout(failedTimer);
      clearInterval(progressInterval);
    };
  }, [timeout]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background to-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fadeIn p-6 rounded-lg bg-background/50 shadow-lg max-w-md text-center">
        <div className="relative">
          <LoadingSpinner size="lg" className="text-primary" />
        </div>
        <p className="text-lg font-medium text-primary/80">{message}</p>
        
        {/* Progress bar for visual feedback */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${loadingProgress}%` }} 
          />
        </div>
        
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          {loadingFailed ? "Loading failed" : "Loading your information..."}
        </p>
        
        {(showFallback || loadingFailed) && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {loadingFailed 
                ? "We couldn't load the application. Please try refreshing the page or clearing your cache."
                : longWait 
                  ? "This is taking longer than expected. There might be a problem loading the application."
                  : "Taking longer than expected? Try refreshing the page."}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                className="px-4 py-2"
                variant={loadingFailed ? "default" : "outline"}
              >
                Refresh
              </Button>
              
              {(longWait || loadingFailed) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Clear local storage and reload as a last resort
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                >
                  Clear Cache & Reload
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
