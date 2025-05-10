
import React, { Suspense, lazy, ComponentType } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { logError } from '@/utils/error-logging-service';

/**
 * A wrapper to lazy load components with error handling and loading indication
 * @param importFunc The dynamic import function for the component
 * @param fallback Optional custom fallback component
 * @param errorHandler Optional custom error handler
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback = <LoadingScreen />,
  errorHandler?: (error: Error) => void
) {
  const LazyComponent = lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      logError(error instanceof Error ? error : new Error('Failed to load component'));
      if (errorHandler) errorHandler(error instanceof Error ? error : new Error('Failed to load component'));
      throw error;
    }
  });

  return (props: React.ComponentProps<T>) => (
    <ErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Preload a component without rendering it
 * @param importFunc The dynamic import function for the component
 */
export const preloadComponent = (importFunc: () => Promise<{ default: any }>) => {
  importFunc().catch(error => {
    console.error('Failed to preload component:', error);
  });
};
