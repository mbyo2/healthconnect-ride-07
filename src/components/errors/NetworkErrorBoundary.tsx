
import { useState, useEffect } from "react";
import { useNetwork } from "@/hooks/use-network";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
  retryOnReconnect?: boolean;
}

export const NetworkErrorBoundary = ({
  children,
  fallbackComponent,
  retryOnReconnect = true,
}: NetworkErrorBoundaryProps) => {
  const { isOnline, connectionQuality } = useNetwork();
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset error state when coming back online
  useEffect(() => {
    if (isOnline && hasError && retryOnReconnect) {
      // Add a small delay to ensure connection is stable
      const timer = setTimeout(() => {
        setHasError(false);
        setRetryCount(prev => prev + 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasError, retryOnReconnect]);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount(prev => prev + 1);
  };

  if (hasError && !isOnline) {
    return fallbackComponent || (
      <div className="p-4 border rounded-lg bg-background shadow-sm">
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Network Error</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">We're having trouble connecting to the server. Please check your internet connection.</p>
            <Button 
              onClick={handleRetry}
              variant="outline" 
              className="flex items-center gap-2 bg-white dark:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isOnline && connectionQuality === "poor") {
    return (
      <>
        <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800">
          <Wifi className="h-4 w-4" />
          <AlertTitle>Slow Connection</AlertTitle>
          <AlertDescription>
            Your internet connection is unstable. Some features may respond slower than usual.
          </AlertDescription>
        </Alert>
        {children}
      </>
    );
  }

  // We use a key based on retry count to force remounting children when retrying
  return <div key={`network-boundary-${retryCount}`}>{children}</div>;
};
