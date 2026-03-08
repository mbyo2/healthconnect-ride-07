
import { useEffect, useState, useMemo, useRef } from 'react';

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
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newWidth = window.innerWidth;
        if (Math.abs(newWidth - widthRef.current) > 50) {
          setWidth(newWidth);
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
    };
  }, []); // Stable — no deps needed, uses ref

  return useMemo(() => {
    const detectDeviceType = (): DeviceType => {
      if (typeof window === 'undefined') return 'unknown';
      if (
        /\b(smart[-_]?tv|hbbtv|appletv|googletv|hdmi|netcast|viera|nettv|roku|kdl|bravia|skyworth|sony-bravia)\b/i.test(navigator.userAgent) ||
        /\b(tv|dtv|smarttv|opera tv)/i.test(navigator.appVersion)
      ) return 'tv';
      if (width <= 640) return 'mobile';
      if (width <= 1024) return 'tablet';
      return 'desktop';
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
}
