
import React, { useState, useRef, useEffect } from 'react';
import { useTouchFeedback } from '@/hooks/use-touch-feedback';

interface MobileTouchListProps {
  children: React.ReactNode;
  onItemClick?: (index: number) => void;
  itemClassName?: string;
  enableSwipe?: boolean;
  onSwipeLeft?: (index: number) => void;
  onSwipeRight?: (index: number) => void;
  swipeThreshold?: number;
  className?: string;
}

export function MobileTouchList({
  children,
  onItemClick,
  itemClassName = '',
  enableSwipe = false,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 80,
  className = '',
}: MobileTouchListProps) {
  const touchFeedbackProps = useTouchFeedback();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset item references when children change
  useEffect(() => {
    itemRefs.current = Array(React.Children.count(children)).fill(null);
  }, [children]);

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    if (!enableSwipe) return;
    
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setActiveIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipe || activeIndex === null || touchStartXRef.current === null || touchStartYRef.current === null) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    
    const diffX = touchX - touchStartXRef.current;
    const diffY = touchY - touchStartYRef.current;
    
    // If vertical scrolling is more significant than horizontal, don't interfere
    if (Math.abs(diffY) > Math.abs(diffX)) return;
    
    // Prevent default to avoid scrolling while swiping horizontally
    if (Math.abs(diffX) > 10) {
      e.preventDefault();
    }
    
    const currentItem = itemRefs.current[activeIndex];
    if (currentItem) {
      // Apply transform to item while swiping
      currentItem.style.transform = `translateX(${diffX}px)`;
      currentItem.style.transition = 'none';
    }
  };

  const handleTouchEnd = (index: number) => {
    if (!enableSwipe || touchStartXRef.current === null) {
      if (onItemClick) onItemClick(index);
      return;
    }
    
    const currentItem = itemRefs.current[index];
    if (currentItem) {
      // Get the current transform value
      const style = window.getComputedStyle(currentItem);
      const transform = style.getPropertyValue('transform');
      const matrix = new DOMMatrix(transform);
      const translateX = matrix.m41;
      
      // Reset transition for smooth animation
      currentItem.style.transition = 'transform 0.3s ease';
      
      // Handle swipe if threshold is met
      if (translateX < -swipeThreshold) {
        // Swipe left action
        if (onSwipeLeft) {
          onSwipeLeft(index);
          currentItem.style.transform = 'translateX(-100%)';
          setTimeout(() => {
            currentItem.style.transform = 'translateX(0)';
          }, 300);
        } else {
          currentItem.style.transform = 'translateX(0)';
        }
      } else if (translateX > swipeThreshold) {
        // Swipe right action
        if (onSwipeRight) {
          onSwipeRight(index);
          currentItem.style.transform = 'translateX(100%)';
          setTimeout(() => {
            currentItem.style.transform = 'translateX(0)';
          }, 300);
        } else {
          currentItem.style.transform = 'translateX(0)';
        }
      } else {
        // Reset position if swipe was not strong enough
        currentItem.style.transform = 'translateX(0)';
        
        // If it was a tap/click rather than a swipe
        if (Math.abs(translateX) < 5 && onItemClick) {
          onItemClick(index);
        }
      }
    }
    
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setActiveIndex(null);
  };

  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, (child, index) => (
        <div
          ref={el => itemRefs.current[index] = el}
          key={index}
          className={`relative ${itemClassName}`}
          onTouchStart={e => handleTouchStart(index, e)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => handleTouchEnd(index)}
          {...touchFeedbackProps}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
