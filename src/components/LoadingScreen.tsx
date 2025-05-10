
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const LoadingScreen = () => {
  const [showFallback, setShowFallback] = useState(false);
  
  // Show fallback content if loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 5000); // Show fallback message after 5 seconds
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background to-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fadeIn p-6 rounded-lg bg-background/50 shadow-lg">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-lg font-medium text-primary/80 animate-pulse">Just a moment please...</p>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          We're preparing your information
        </p>
        
        {showFallback && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Taking longer than expected? Try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
