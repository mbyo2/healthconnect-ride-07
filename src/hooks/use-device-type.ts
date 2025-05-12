
import { useEffect, useState, useMemo } from 'react';

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
  
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      // Throttle resize events to avoid excessive re-renders
      if (Math.abs(window.innerWidth - width) > 50) {
        setWidth(window.innerWidth);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);
  
  const deviceData = useMemo(() => {
    // Initial device type detection
    const detectDeviceType = (): DeviceType => {
      if (typeof window === 'undefined') return 'unknown';
      
      // First check if we're on a TV
      if (
        navigator.userAgent.toLowerCase().indexOf('smart-tv') > -1 ||
        navigator.userAgent.toLowerCase().indexOf('tv') > -1 ||
        /\b(smart[-_]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|kdl|bravia|skyworth|sony-bravia)\b/i.test(navigator.userAgent.toLowerCase()) ||
        /\b(tv|dtv|smarttv|opera tv|televízio)/i.test(navigator.appVersion) ||
        window.matchMedia('(device-width: 1920px) and (device-height: 1080px)').matches
      ) {
        return 'tv';
      }

      // Then check for other devices using breakpoints
      if (width <= 768) {
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
