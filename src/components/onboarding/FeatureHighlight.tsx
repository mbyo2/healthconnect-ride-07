
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FeatureHighlightProps {
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
  onDismiss: () => void;
  showDelay?: number;
}

export function FeatureHighlight({
  targetSelector,
  title,
  description,
  position = 'bottom',
  onDismiss,
  showDelay = 500,
}: FeatureHighlightProps) {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const targetElement = document.querySelector(targetSelector);
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipWidth = 250; // Approximate width of tooltip
        const tooltipHeight = 120; // Approximate height of tooltip
        
        let top = 0;
        let left = 0;
        
        switch (position) {
          case 'top':
            top = rect.top - tooltipHeight - 10;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'right':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.right + 10;
            break;
          case 'bottom':
            top = rect.bottom + 10;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            break;
          case 'left':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.left - tooltipWidth - 10;
            break;
        }
        
        // Make sure tooltip stays within viewport
        if (top < 10) top = 10;
        if (left < 10) left = 10;
        if (left + tooltipWidth > window.innerWidth - 10) {
          left = window.innerWidth - tooltipWidth - 10;
        }
        
        setStyle({ top, left });
        setVisible(true);
        
        // Add highlight effect to target element
        targetElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        
        return () => {
          targetElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        };
      }
    }, showDelay);
    
    return () => clearTimeout(timer);
  }, [targetSelector, position, showDelay]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div 
      className="fixed z-50 bg-popover border shadow-lg rounded-lg p-4 max-w-[250px] animate-fade-in"
      style={{
        top: `${style.top}px`,
        left: `${style.left}px`,
      }}
    >
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute right-1 top-1 h-6 w-6 p-0" 
        onClick={handleDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
      
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      
      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={handleDismiss} variant="outline" className="text-xs">
          Got it
        </Button>
      </div>
      
      {/* Arrow indicator based on position */}
      <div 
        className={`absolute w-3 h-3 bg-popover border rotate-45
          ${position === 'top' ? 'bottom-[-6px] left-1/2 transform -translate-x-1/2 border-t-0 border-l-0' : ''}
          ${position === 'right' ? 'left-[-6px] top-1/2 transform -translate-y-1/2 border-t-0 border-r-0' : ''}
          ${position === 'bottom' ? 'top-[-6px] left-1/2 transform -translate-x-1/2 border-b-0 border-r-0' : ''}
          ${position === 'left' ? 'right-[-6px] top-1/2 transform -translate-y-1/2 border-b-0 border-l-0' : ''}
        `}
      />
    </div>
  );
}
