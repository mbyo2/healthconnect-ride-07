
/**
 * Error logging and monitoring service
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorReport {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  metadata?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

import { safeLocalGet } from './storage';

// Configuration with sensible defaults
const config = {
  captureConsoleErrors: true,
  captureUnhandledRejections: true,
  captureGlobalErrors: true,
  includeUserInfo: true,
  sampleRate: 1.0, // Capture 100% of errors by default
  debug: false
};

// Error queue for batched sending
const errorQueue: ErrorReport[] = [];
let sessionId: string;

// Initialize the error logging service
export function initErrorLogging(overrides = {}) {
  Object.assign(config, overrides);
  sessionId = generateSessionId();
  
  if (config.debug) {
    console.info('Error logging initialized with config:', config);
  }
  
  // Set up global error handlers
  if (config.captureGlobalErrors) {
    window.addEventListener('error', handleGlobalError);
  }
  
  if (config.captureUnhandledRejections) {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  }
  
  if (config.captureConsoleErrors) {
    interceptConsoleErrors();
  }
  
  // Set up interval to flush errors
  setInterval(flushErrors, 30000);
}

// Generate a random session ID
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Handle global errors
function handleGlobalError(event: ErrorEvent) {
  logError(event.error || new Error(event.message), {
    source: event.filename,
    line: event.lineno,
    column: event.colno,
    type: 'global'
  });
}

// Handle unhandled promise rejections
function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason) || 'Unknown promise rejection');
    
  logError(error, { type: 'unhandledRejection' });
}

// Intercept console.error calls
function interceptConsoleErrors() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Call original to preserve normal behavior
    originalConsoleError.apply(console, args);
    
    // Log the error if the first argument is an Error object
    if (args[0] instanceof Error) {
      logError(args[0], { type: 'console', additionalArgs: args.slice(1) });
    } else if (typeof args[0] === 'string') {
      logError(new Error(args[0]), { type: 'console', additionalArgs: args.slice(1) });
    }
  };
}

// Main error logging function
export function logError(
  error: Error | string,
  metadata: Record<string, any> = {},
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) {
  try {
    // Check if we should sample this error
    if (Math.random() > config.sampleRate) {
      if (config.debug) console.debug(`Error logging: Sampling skipped error`);
      return;
    }
    
    const errorObj = error instanceof Error ? error : new Error(error);
    
    const errorReport: ErrorReport = {
      message: errorObj.message,
      stack: errorObj.stack,
      severity,
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        // Add browser and device info
        screen: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0
        }
      },
      timestamp: new Date().toISOString(),
      sessionId
    };
    
    // Add user ID if available and allowed
    if (config.includeUserInfo) {
      try {
        const userIdFromStorage = safeLocalGet('userId');
        if (userIdFromStorage) {
          errorReport.userId = userIdFromStorage;
        }
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Add to queue
    errorQueue.push(errorReport);
    
    // Log locally in development
    if (config.debug) {
      console.debug('Error logged:', errorReport);
    }
    
    // Flush immediately for high or critical errors
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      flushErrors(true);
    }
  } catch (loggingError) {
    // Avoid infinite loops by not logging errors from the error logger
    console.error('Error in error logger:', loggingError);
  }
}

// Flush errors to backend
async function flushErrors(immediate = false) {
  if (errorQueue.length === 0) return;
  
  try {
    const errorsToSend = [...errorQueue];
    errorQueue.length = 0; // Clear the queue
    
    // In a real implementation, send to backend
    if (config.debug) {
      console.debug(`Error logging: Flushing ${errorsToSend.length} errors`, errorsToSend);
    }
    
    // In production this would be an API call
    // await fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ errors: errorsToSend }),
    // });
  } catch (error) {
    console.error('Error flushing error reports:', error);
    // Don't add this error to the queue to avoid infinite loops
  }
}
