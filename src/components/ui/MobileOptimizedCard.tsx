import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileOptimizedCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  noPadding?: boolean;
}

export const MobileOptimizedCard: React.FC<MobileOptimizedCardProps> = ({
  title,
  description,
  children,
  className,
  compact = false,
  noPadding = false
}) => {
  return (
    <Card className={cn(
      "w-full shadow-sm border-border/50",
      compact && "shadow-none border-0 bg-transparent",
      className
    )}>
      {(title || description) && (
        <CardHeader className={cn(
          compact ? "px-0 py-2" : "px-3 py-4 sm:px-6",
          noPadding && "p-0"
        )}>
          {title && (
            <CardTitle className={cn(
              "text-base sm:text-lg font-semibold leading-tight",
              compact && "text-sm font-medium"
            )}>
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className={cn(
              "text-sm text-muted-foreground mt-1",
              compact && "text-xs"
            )}>
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(
        compact ? "px-0 py-2" : "px-3 py-4 sm:px-6",
        noPadding && "p-0",
        !title && !description && (compact ? "pt-2" : "pt-4 sm:pt-6")
      )}>
        {children}
      </CardContent>
    </Card>
  );
};

export default MobileOptimizedCard;
