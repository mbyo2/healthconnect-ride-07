
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface LoadingScreenProps {
  message?: string;
  timeout?: number; // Timeout in ms for showing fallback content
}

export const LoadingScreen = ({ 
  message = "Just a moment please...", 
  timeout = 5000 
}: LoadingScreenProps) => {
  const [showFallback, setShowFallback] = useState(false);
  const [longWait, setLongWait] = useState(false);
  
  // Show fallback content if loading takes too long
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, timeout); // Show fallback message after timeout
    
    const longWaitTimer = setTimeout(() => {
      setLongWait(true);
    }, timeout * 2); // Show more serious message after double timeout
    
    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(longWaitTimer);
    };
  }, [timeout]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background to-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fadeIn p-6 rounded-lg bg-background/50 shadow-lg max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-lg font-medium text-primary/80 animate-pulse">{message}</p>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          We're preparing your information
        </p>
        
        {showFallback && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {longWait 
                ? "This is taking longer than expected. There might be a problem loading the application."
                : "Taking longer than expected? Try refreshing the page."}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                className="px-4 py-2"
                variant={longWait ? "default" : "outline"}
              >
                Refresh
              </Button>
              
              {longWait && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Clear local storage and reload as a last resort
                    if (window.confirm("Would you like to clear cached data and reload? This may help resolve the issue.")) {
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.reload();
                    }
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
