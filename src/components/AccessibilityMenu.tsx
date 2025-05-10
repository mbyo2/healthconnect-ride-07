
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { Accessibility, Type, Monitor, ZoomIn, Book, Mic, MicOff, MinusCircle, PlusCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export const AccessibilityMenu = () => {
  // Use the enhanced accessibility context
  const { 
    textSize, 
    increaseTextSize, 
    decreaseTextSize, 
    resetTextSize,
    isEasyReadingEnabled,
    enableEasyReading,
    disableEasyReading,
    speakContent,
    isSpeaking,
    stopSpeaking
  } = useAccessibility();
  
  // State for various accessibility settings
  const [highContrast, setHighContrast] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // Toggle high contrast mode
  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    
    if (newValue) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    toast.success(newValue ? 'High contrast enabled' : 'High contrast disabled');
  };
  
  // Toggle easy reading mode
  const toggleEasyReading = () => {
    if (isEasyReadingEnabled) {
      disableEasyReading();
      toast.success('Easy reading disabled');
    } else {
      enableEasyReading();
      toast.success('Easy reading enabled');
    }
  };
  
  // Read page content aloud
  const readPageContent = () => {
    // If already speaking, stop it
    if (isSpeaking) {
      stopSpeaking();
      setIsReading(false);
      return;
    }
    
    setIsReading(true);
    
    // Get main content text
    const mainContent = document.getElementById('main-content');
    const contentToRead = mainContent
      ? Array.from(mainContent.querySelectorAll('h1, h2, h3, p, li, button:not([aria-hidden="true"]), [role="button"]:not([aria-hidden="true"])'))
          .map(el => el.textContent)
          .filter(Boolean)
          .join('. ')
      : 'No readable content found on this page';
      
    // Speak the content
    speakContent(contentToRead);
    
    // Reset reading state when speech ends
    const checkSpeaking = setInterval(() => {
      if (!isSpeaking) {
        setIsReading(false);
        clearInterval(checkSpeaking);
      }
    }, 500);
  };

  // Set simplified mode for very sick patients
  const toggleSimplifiedMode = () => {
    const current = localStorage.getItem('simplifiedMode') === 'true';
    localStorage.setItem('simplifiedMode', (!current).toString());
    toast.success(!current ? 'Simplified mode enabled' : 'Simplified mode disabled', {
      description: 'Page will reload to apply changes'
    });
    // Give toast time to show before reload
    setTimeout(() => window.location.reload(), 1500);
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
          
          {/* Text size controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text Size
              </Label>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={decreaseTextSize}
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <span className="mx-2 text-sm">
                  {Math.round(textSize * 100)}%
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={increaseTextSize}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Slider
              value={[textSize]}
              min={0.8}
              max={1.5}
              step={0.05}
              onValueChange={(value) => {
                document.documentElement.style.fontSize = `${value[0] * 100}%`;
              }}
              onValueCommit={(value) => {
                localStorage.setItem('accessibility_text_size', value[0].toString());
              }}
              aria-label="Adjust text size"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={resetTextSize}
            >
              Reset to Default
            </Button>
          </div>
          
          {/* Easy Reading Mode for sick patients */}
          <div className="flex items-center justify-between">
            <Label htmlFor="easy-reading" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Easy Reading Mode
            </Label>
            <Switch
              id="easy-reading"
              checked={isEasyReadingEnabled}
              onCheckedChange={toggleEasyReading}
              aria-label="Toggle easy reading mode"
            />
          </div>
          
          {/* High Contrast Mode */}
          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              High Contrast
            </Label>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={toggleHighContrast}
              aria-label="Toggle high contrast mode"
            />
          </div>
          
          {/* Read aloud feature */}
          <div className="flex items-center justify-between">
            <Label htmlFor="read-aloud" className="flex items-center gap-2">
              {isReading ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              Read Page Aloud
            </Label>
            <Button
              id="read-aloud"
              variant={isReading ? "default" : "outline"}
              size="sm"
              onClick={readPageContent}
              aria-pressed={isReading}
            >
              {isReading ? "Stop Reading" : "Start"}
            </Button>
          </div>
          
          {/* Simplified Mode for very sick patients */}
          <div className="flex items-center justify-between">
            <Label htmlFor="simplified-mode" className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              Simplified Mode
            </Label>
            <Switch
              id="simplified-mode"
              checked={localStorage.getItem('simplifiedMode') === 'true'}
              onCheckedChange={toggleSimplifiedMode}
              aria-label="Toggle simplified mode for sick patients"
            />
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground">
            <p>These settings improve the readability and visibility of the website content for patients who may have difficulty using the application.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
