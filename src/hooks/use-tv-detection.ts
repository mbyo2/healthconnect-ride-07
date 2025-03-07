import { useState, useEffect } from 'react';
import { useMediaQuery } from './use-media-query';

export function useIsTVDevice() {
  const [isTV, setIsTV] = useState(false);
  const isLargeScreen = useMediaQuery('(min-width: 1920px)');
  const isNonHoverDevice = useMediaQuery('(hover: none)');
  
  useEffect(() => {
    // Helper function to detect Android TV
    const detectAndroidTV = () => {
      // User agent detection for Android TV
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroidTV = 
        userAgent.includes('android tv') || 
        userAgent.includes('androidtv') || 
        (userAgent.includes('android') && 
         (userAgent.includes('smart-tv') || 
          userAgent.includes('large-screen') || 
          userAgent.includes('leanback') || 
          userAgent.includes('gfst')));
      
      // Other TV platform detections
      const isTizen = userAgent.includes('tizen');
      const isWebOS = userAgent.includes('webos') || userAgent.includes('web0s');
      const isFireTV = userAgent.includes('firetv') || userAgent.includes('fire tv');
      
      // Check for TV specific properties
      const hasNavigatorTV = 'tv' in navigator;
      
      // Combine all TV platform detections
      return isAndroidTV || isTizen || isWebOS || isFireTV || hasNavigatorTV;
    };
    
    // Combine media queries with user agent detection
    const tvDetected = (isLargeScreen && isNonHoverDevice) || detectAndroidTV();
    setIsTV(tvDetected);
    
    // Add TV class to body if detected
    if (tvDetected) {
      document.body.classList.add('tv-device');
    } else {
      document.body.classList.remove('tv-device');
    }
    
    return () => {
      document.body.classList.remove('tv-device');
    };
  }, [isLargeScreen, isNonHoverDevice]);
  
  return isTV;
}
