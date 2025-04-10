
import { useEffect, useState } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'tv' | 'unknown';

export function useDeviceType(): {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
} {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  
  useEffect(() => {
    const detectDeviceType = (): DeviceType => {
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
      if (window.innerWidth <= 768) {
        return 'mobile';
      } else if (window.innerWidth <= 1024) {
        return 'tablet';
      } else {
        return 'desktop';
      }
    };
    
    const handleResize = () => {
      setDeviceType(detectDeviceType());
    };
    
    // Initial detection
    handleResize();
    
    // Update on resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isTV: deviceType === 'tv',
  };
}
