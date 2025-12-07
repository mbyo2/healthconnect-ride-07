import React, { useEffect } from 'react';
import { logError } from '@/utils/error-logging-service';
import { toast } from 'sonner';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  useEffect(() => {
    // Keep track of errors to avoid reporting duplicates
    const reportedErrors = new Set<string>();
    
    const handleError = (event: ErrorEvent) => {
      // Create a unique ID for this error
      const errorId = `${event.message}:${event.filename}:${event.lineno}`;
      
      // Only report unique errors to avoid spam
      if (!reportedErrors.has(errorId)) {
        reportedErrors.add(errorId);
        
        // Log error to our system
        logError(event.error || new Error(event.message), {
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          type: 'global'
        });
        
        // Display user-friendly error
        toast.error('Something went wrong', {
          description: 'We encountered an issue and our team has been notified.',
          duration: 5000,
        });
        
        // Automatically clear old errors from set after some time
        setTimeout(() => {
          reportedErrors.delete(errorId);
        }, 1000 * 60 * 5); // Remove after 5 minutes
      }
      
      // Don't prevent the default error handling
      return false;
    };

    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || 'Unknown promise rejection';
      const errorId = `promise:${errorMessage}`;
      
      if (!reportedErrors.has(errorId)) {
        reportedErrors.add(errorId);
        
        // Log to our system
        const error = event.reason instanceof Error 
          ? event.reason 
          : new Error(String(event.reason) || 'Unknown promise rejection');
        
        logError(error, { type: 'unhandledRejection' });
        
        // Display user-friendly toast only for certain errors
        // This helps avoid spamming the user with technical errors
        if (!errorMessage.includes('NetworkError') && 
            !errorMessage.includes('AbortError') &&
            !errorMessage.includes('Failed to fetch') &&
            !errorMessage.includes('operation is insecure') &&
            !errorMessage.includes('The operation is insecure')) {
          toast.error('Something went wrong', {
            description: 'We encountered an issue and our team has been notified.',
            duration: 5000,
          });
        }
        
        setTimeout(() => {
          reportedErrors.delete(errorId);
        }, 1000 * 60 * 5); // Remove after 5 minutes
      }
      
      // Don't prevent the default rejection handling
      return false;
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return <>{children}</>;
}
