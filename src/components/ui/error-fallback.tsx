import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try refreshing the page.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button onClick={resetError} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Go to Home
          </Button>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mt-4 p-4 bg-muted rounded-lg">
            <summary className="cursor-pointer font-medium mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="text-xs overflow-auto">
              {error.message}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};