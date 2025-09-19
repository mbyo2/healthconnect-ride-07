import { toast } from 'sonner';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: AppError[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error | AppError | any, context?: string): void {
    const appError: AppError = this.normalizeError(error, context);
    
    // Log error
    this.logError(appError);
    
    // Store error for debugging
    this.errors.push(appError);
    
    // Show user-friendly message
    this.showUserMessage(appError);
    
    // Report to monitoring service in production
    if (import.meta.env.PROD) {
      this.reportError(appError);
    }
  }

  private normalizeError(error: any, context?: string): AppError {
    if (error instanceof Error) {
      return {
        code: error.name || 'UnknownError',
        message: error.message,
        details: { stack: error.stack, context },
        timestamp: new Date(),
      };
    }

    if (typeof error === 'object' && error.code && error.message) {
      return {
        ...error,
        timestamp: error.timestamp || new Date(),
        details: { ...error.details, context },
      };
    }

    return {
      code: 'UnknownError',
      message: typeof error === 'string' ? error : 'An unexpected error occurred',
      details: { originalError: error, context },
      timestamp: new Date(),
    };
  }

  private logError(error: AppError): void {
    console.error(`[${error.timestamp.toISOString()}] ${error.code}: ${error.message}`, error.details);
  }

  private showUserMessage(error: AppError): void {
    const userMessage = this.getUserFriendlyMessage(error);
    
    if (error.code.includes('Network') || error.code.includes('Connection')) {
      toast.error(userMessage, {
        description: 'Please check your internet connection and try again.',
        duration: 5000,
      });
    } else if (error.code.includes('Auth')) {
      toast.error(userMessage, {
        description: 'Please sign in again to continue.',
        duration: 5000,
      });
    } else {
      toast.error(userMessage, {
        duration: 4000,
      });
    }
  }

  private getUserFriendlyMessage(error: AppError): string {
    const friendlyMessages: Record<string, string> = {
      'NetworkError': 'Connection problem occurred',
      'AuthError': 'Authentication failed',
      'ValidationError': 'Please check your input',
      'NotFoundError': 'The requested resource was not found',
      'PermissionError': 'You don\'t have permission to perform this action',
      'RateLimitError': 'Too many requests, please try again later',
      'ServerError': 'Server error occurred, please try again',
    };

    return friendlyMessages[error.code] || 'Something went wrong';
  }

  private reportError(error: AppError): void {
    // In production, send to monitoring service like Sentry, LogRocket, etc.
    // For now, we'll just log it
    console.warn('Error reporting not implemented yet:', error);
  }

  public getRecentErrors(limit: number = 10): AppError[] {
    return this.errors.slice(-limit);
  }

  public clearErrors(): void {
    this.errors = [];
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Global error boundary for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(event.reason, 'unhandledrejection');
  });

  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error, 'global-error');
  });
}

// Utility functions for common error scenarios
export const handleApiError = (error: any, operation: string) => {
  errorHandler.handleError(error, `API: ${operation}`);
};

export const handleAuthError = (error: any) => {
  errorHandler.handleError({
    code: 'AuthError',
    message: error.message || 'Authentication failed',
    details: error,
  });
};

export const handleValidationError = (field: string, message: string) => {
  errorHandler.handleError({
    code: 'ValidationError',
    message: `${field}: ${message}`,
    details: { field },
  });
};
