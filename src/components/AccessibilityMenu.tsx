
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Accessibility, Type, Monitor, ZoomIn } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export const AccessibilityMenu = () => {
  // State for various accessibility settings
  const [fontSize, setFontSize] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  
  // Apply font size scaling to the document
  const changeFontSize = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${100 * newSize}%`;
  };
  
  // Toggle high contrast mode
  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };
  
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 rounded-full"
                aria-label="Accessibility options"
              >
                <Accessibility className="h-5 w-5" />
                <span className="sr-only">Accessibility options</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Accessibility options</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Accessibility Settings</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text Size
              </Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(fontSize * 100)}%
              </span>
            </div>
            <Slider
              id="font-size"
              value={[fontSize]}
              min={0.8}
              max={1.5}
              step={0.05}
              onValueChange={changeFontSize}
              aria-label="Adjust text size"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              High Contrast
            </Label>
            <Button
              id="high-contrast"
              variant={highContrast ? "default" : "outline"}
              size="sm"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
            >
              {highContrast ? "On" : "Off"}
            </Button>
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground">
            <p>These settings improve the readability and visibility of the website content.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
