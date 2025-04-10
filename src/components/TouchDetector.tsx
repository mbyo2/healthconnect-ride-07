
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function TouchDetector() {
  const [touchEnabled, setTouchEnabled] = useState<boolean | null>(null);
  const [touchPoints, setTouchPoints] = useState(0);
  const [lastTouchSize, setLastTouchSize] = useState({ width: 0, height: 0 });
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    // Detect touch support
    setTouchEnabled('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    // Create listeners for touch events
    const handleTouchStart = (e: TouchEvent) => {
      setTouchPoints(e.touches.length);
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        setLastTouchSize({
          width: touch.radiusX || 0,
          height: touch.radiusY || 0
        });
      }
    };
    
    const handleTouchEnd = () => {
      setTouchPoints(0);
    };
    
    // Add listeners
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    
    // Dev mode only - show debug in development or when queried
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('debug') === 'touch' || process.env.NODE_ENV === 'development') {
      setShowDebug(true);
    }
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
  if (!showDebug) return null;
  
  return (
    <div className="fixed top-16 right-2 z-50 bg-background/90 backdrop-blur-sm p-3 rounded-lg border shadow-md text-xs max-w-52">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Touch Debug</h4>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0" 
          onClick={() => setShowDebug(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-1">
        <div>Touch: {touchEnabled ? 'Enabled' : 'Disabled'}</div>
        <div>Touch Points: {touchPoints}</div>
        <div>Touch Size: {Math.round(lastTouchSize.width)}x{Math.round(lastTouchSize.height)}</div>
        <div>Screen: {window.innerWidth}x{window.innerHeight}</div>
      </div>
    </div>
  );
}
