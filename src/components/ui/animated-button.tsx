import React, { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { CompletionIndicator } from '@/components/ui/completion-indicator';
import { useFeedbackSystem } from '@/hooks/use-feedback-system';
import { cn } from '@/lib/utils';

export interface AnimatedButtonProps extends ButtonProps {
  onAsyncClick?: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  showCompletionIndicator?: boolean;
  enableFeedback?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export function AnimatedButton({
  onAsyncClick,
  onClick,
  successMessage = 'Action completed successfully!',
  errorMessage = 'An error occurred',
  showCompletionIndicator = true,
  enableFeedback = true,
  loading = false,
  loadingText = 'Loading...',
  children,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { showSuccess, showError, initialize } = useFeedbackSystem();
  
  // Use external loading state if provided
  const isLoading = loading || status === 'loading';

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    // Initialize feedback system on first interaction
    initialize();

    if (onAsyncClick) {
      try {
        setStatus('loading');
        await onAsyncClick();
        setStatus('success');
        
        if (enableFeedback) {
          showSuccess(successMessage);
        }
        
        // Reset status after animation
        setTimeout(() => setStatus('idle'), 2000);
      } catch (error) {
        setStatus('error');
        
        if (enableFeedback) {
          showError(errorMessage);
        }
        
        // Reset status after animation
        setTimeout(() => setStatus('idle'), 2000);
      }
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <CompletionIndicator 
      status={showCompletionIndicator ? status : 'idle'}
      className="inline-block"
    >
      <Button
        {...props}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          'transition-all duration-200 transform-gpu',
          isLoading && 'scale-95 opacity-80',
          status === 'success' && 'scale-105',
          'hover:scale-105 active:scale-95',
          className
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText}
          </div>
        ) : (
          children
        )}
      </Button>
    </CompletionIndicator>
  );
}
