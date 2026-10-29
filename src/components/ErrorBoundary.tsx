import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunkRecovery';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // A chunk-load failure means this tab is running a stale build (open
    // across a deploy). Resetting state would just re-run the same failed
    // import — reload once onto the current build instead. Covers lazy
    // surfaces that do not go through the router's lazyWithRetry wrapper.
    // reloadOnceForChunkError is loop-guarded and a no-op for other errors.
    reloadOnceForChunkError(error);
  }

  handleRetry = () => {
    // For a chunk-load failure, only a hard reload can help: it fetches
    // the current shell and chunks. This is user-driven, so it is safe
    // even when the automatic reload guard has already tripped.
    if (this.state.error && isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. Please try again — if the problem
            continues, please contact support.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={this.handleRetry}
              variant="outline"
            >
              Try Again
            </Button>
            <Button onClick={() => window.location.assign('/')}>
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
