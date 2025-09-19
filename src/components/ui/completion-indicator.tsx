import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompletionIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CompletionIndicator({ 
  status, 
  size = 'md', 
  showAnimation = true, 
  className,
  children 
}: CompletionIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setIsVisible(true);
    }
  }, [status]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          bgColor: 'bg-green-500',
          icon: <Check className={iconSizeClasses[size]} />,
          animation: showAnimation ? 'animate-in zoom-in-50 duration-300' : ''
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: <X className={iconSizeClasses[size]} />,
          animation: showAnimation ? 'animate-in zoom-in-50 duration-300 animate-pulse' : ''
        };
      case 'warning':
        return {
          bgColor: 'bg-yellow-500',
          icon: <AlertCircle className={iconSizeClasses[size]} />,
          animation: showAnimation ? 'animate-in zoom-in-50 duration-300' : ''
        };
      case 'info':
        return {
          bgColor: 'bg-blue-500',
          icon: <Info className={iconSizeClasses[size]} />,
          animation: showAnimation ? 'animate-in zoom-in-50 duration-300' : ''
        };
      case 'loading':
        return {
          bgColor: 'bg-gray-400',
          icon: (
            <div className={cn(
              'border-2 border-white border-t-transparent rounded-full animate-spin',
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
          ),
          animation: showAnimation ? 'animate-in fade-in duration-300' : ''
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config || !isVisible) return children || null;

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      {children}
      <div className={cn(
        'absolute -top-1 -right-1 rounded-full flex items-center justify-center text-white shadow-lg',
        sizeClasses[size],
        config.bgColor,
        config.animation
      )}>
        {config.icon}
      </div>
    </div>
  );
}

export function CheckmarkAnimation({ 
  isVisible, 
  size = 'md',
  onComplete 
}: { 
  isVisible: boolean; 
  size?: 'sm' | 'md' | 'lg';
  onComplete?: () => void;
}) {
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowCheckmark(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!showCheckmark) return null;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn(
      'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50',
      'bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl',
      sizeClasses[size],
      'animate-in zoom-in-0 duration-500 ease-out'
    )}>
      <Check className={cn(
        size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8',
        'animate-in zoom-in-50 duration-300 delay-200'
      )} />
    </div>
  );
}
