
import { useState, useEffect } from 'react';

export const useIsTVDevice = (): boolean => {
  const [isTV, setIsTV] = useState<boolean>(false);

  useEffect(() => {
    const checkForTVDevice = () => {
      // Check for common TV user agent strings
      const ua = navigator.userAgent.toLowerCase();
      
      // Check for TV specific browsers
      const isTVBrowser = [
        'tv', 
        'smart-tv', 
        'smarttv', 
        'appletv', 
        'googletv', 
        'webos', 
        'tizen',
        'vidaa',
        'netcast',
        'vizio',
        'roku'
      ].some(keyword => ua.includes(keyword));
      
      // Check for large screen with no typical mobile/desktop interactions
      const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isLargeScreen = window.screen.width >= 1280 && window.screen.height >= 720;
      const hasPointer = window.matchMedia('(pointer:fine)').matches;
      const hasGamepad = 'getGamepads' in navigator;
      
      // TV devices typically don't have pointer/mouse but may have gamepad or remote control
      const isProbablyTV = isLargeScreen && 
                          !hasPointer && 
                          (!hasTouchscreen || hasGamepad);
      
      // Set isTV if either condition is met
      setIsTV(isTVBrowser || isProbablyTV);
      
      // Set special body class for TV mode styling
      if (isTVBrowser || isProbablyTV) {
        document.body.classList.add('tv-mode');
      }
    };
    
    // Initial check
    checkForTVDevice();
    
    // Also check on resize in case of device orientation change
    window.addEventListener('resize', checkForTVDevice);
    
    return () => {
      window.removeEventListener('resize', checkForTVDevice);
    };
  }, []);

  return isTV;
};
