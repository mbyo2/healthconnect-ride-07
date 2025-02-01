import * as React from 'react';
import { useRouteError } from 'react-router-dom';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export const RouteErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  const error = useRouteError();

  React.useEffect(() => {
    if (error) {
      setHasError(true);
      console.error('Route error:', error);
    }
  }, [error]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          We're sorry, but there was an error loading this page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    );
  }

  return <>{children}</>;
};