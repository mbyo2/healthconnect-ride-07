
import { useCallback, useRef } from 'react';

interface TouchFeedbackOptions {
  rippleColor?: string;
  rippleOpacity?: number;
  rippleDuration?: number;
  disabled?: boolean;
}

export function useTouchFeedback(options: TouchFeedbackOptions = {}) {
  const {
    rippleColor = 'currentColor',
    rippleOpacity = 0.2,
    rippleDuration = 500,
    disabled = false,
  } = options;
  
  const rippleCountRef = useRef(0);
  
  // Create ripple element for visual feedback
  const createRipple = useCallback((event: React.TouchEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    
    const target = event.currentTarget;
    
    // Only use touch position for touch events, fallback to mouse position for clicks
    const isTouchEvent = 'touches' in event;
    const eventX = isTouchEvent 
      ? (event as React.TouchEvent<HTMLElement>).touches[0].clientX
      : (event as React.MouseEvent<HTMLElement>).clientX;
    const eventY = isTouchEvent 
      ? (event as React.TouchEvent<HTMLElement>).touches[0].clientY
      : (event as React.MouseEvent<HTMLElement>).clientY;
    
    // Get target's position relative to viewport
    const rect = target.getBoundingClientRect();
    
    // Calculate ripple position relative to the element
    const x = eventX - rect.left;
    const y = eventY - rect.top;
    
    // Calculate ripple size based on element size
    const size = Math.max(rect.width, rect.height) * 2;
    
    // Create ripple element
    const ripple = document.createElement('span');
    rippleCountRef.current += 1;
    const rippleId = `ripple-${rippleCountRef.current}`;
    ripple.id = rippleId;
    
    // Style the ripple
    ripple.style.position = 'absolute';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = rippleColor;
    ripple.style.opacity = rippleOpacity.toString();
    ripple.style.transform = 'scale(0)';
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    ripple.style.pointerEvents = 'none';
    ripple.style.transition = `transform ${rippleDuration}ms ease-out, opacity ${rippleDuration}ms ease-out`;
    
    // Check if target already has position relative, absolute, or fixed
    const computedStyle = window.getComputedStyle(target);
    const position = computedStyle.getPropertyValue('position');
    
    if (position === 'static') {
      target.style.position = 'relative';
    }
    
    target.style.overflow = 'hidden';
    target.appendChild(ripple);
    
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      ripple.style.transform = 'scale(1)';
      ripple.style.opacity = '0';
    });
    
    // Remove ripple after animation
    setTimeout(() => {
      const existingRipple = document.getElementById(rippleId);
      if (existingRipple) {
        existingRipple.remove();
      }
    }, rippleDuration);
  }, [disabled, rippleColor, rippleOpacity, rippleDuration]);
  
  const touchFeedbackProps = {
    onTouchStart: createRipple,
    onClick: createRipple,
    className: 'touch-manipulation',
    style: { position: 'relative', overflow: 'hidden' } as React.CSSProperties,
  };
  
  return touchFeedbackProps;
}
