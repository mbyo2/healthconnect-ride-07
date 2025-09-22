import React from 'react';
import { cn } from '@/lib/utils';

interface ScrollableContainerProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  showScrollbar?: boolean;
}

export const ScrollableContainer: React.FC<ScrollableContainerProps> = ({
  children,
  className,
  maxHeight = "100%",
  showScrollbar = true
}) => {
  return (
    <div
      className={cn(
        "overflow-y-auto overflow-x-hidden",
        showScrollbar ? "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" : "scrollbar-hide",
        "scroll-smooth",
        className
      )}
      style={{ maxHeight }}
    >
      {children}
    </div>
  );
};

export default ScrollableContainer;
