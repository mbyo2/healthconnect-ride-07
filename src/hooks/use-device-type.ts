
import { useEffect, useState, useMemo, useCallback } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';

export function useDeviceType(): {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
} {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0
  );
  
  // Throttle resize handler for better performance
  const handleResize = useCallback(() => {
    // Only update if the width change is significant
    if (Math.abs(window.innerWidth - width) > 50) {
      setWidth(window.innerWidth);
    }
  }, [width]);
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);
  
  const deviceData = useMemo(() => {
    // Detect device type
    const detectDeviceType = (): DeviceType => {
      if (typeof window === 'undefined') return 'unknown';
      
      // Check if we're on a TV
      if (
        navigator.userAgent.toLowerCase().indexOf('smart-tv') > -1 ||
        navigator.userAgent.toLowerCase().indexOf('tv') > -1 ||
        /\b(smart[-_]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|kdl|bravia|skyworth|sony-bravia)\b/i.test(navigator.userAgent.toLowerCase()) ||
        /\b(tv|dtv|smarttv|opera tv|televízio)/i.test(navigator.appVersion) ||
        window.matchMedia('(device-width: 1920px) and (device-height: 1080px)').matches
      ) {
        return 'tv';
      }

      // Check for other devices using improved breakpoints
      if (width <= 640) {
        return 'mobile';
      } else if (width <= 1024) {
        return 'tablet';
      } else {
        return 'desktop';
      }
    };
    
    const deviceType = detectDeviceType();
    
    return {
      deviceType,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTV: deviceType === 'tv',
    };
  }, [width]);
  
  return deviceData;
}
