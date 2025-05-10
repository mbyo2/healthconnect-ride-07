
import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface OptimizedRouteProps {
  path: string;
  component: () => Promise<{ default: React.ComponentType<any> }>;
  exact?: boolean;
  preload?: boolean;
}

export const OptimizedRoute: React.FC<OptimizedRouteProps> = ({
  path,
  component,
  exact,
  preload = false,
}) => {
  // Preload component if requested
  if (preload) {
    component().catch(error => {
      console.error(`Failed to preload component for path ${path}:`, error);
    });
  }
  
  const LazyComponent = lazy(component);
  
  return (
    <Route
      path={path}
      element={
        <ErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <LazyComponent />
          </Suspense>
        </ErrorBoundary>
      }
    />
  );
};
