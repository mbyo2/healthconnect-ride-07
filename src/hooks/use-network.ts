
import { useState, useEffect, useCallback, useRef } from 'react';

export interface NetworkState {
  isOnline: boolean;
  connectionQuality: 'poor' | 'average' | 'good' | 'excellent' | 'unknown';
  checkConnection: () => Promise<void>;
}

export const useNetwork = (): NetworkState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<NetworkState['connectionQuality']>('unknown');
  const checkingRef = useRef(false);

  const checkConnection = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      if ('connection' in navigator && (navigator as any).connection) {
        const { effectiveType, downlink } = (navigator as any).connection;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionQuality('poor');
        } else if (effectiveType === '3g') {
          setConnectionQuality('average');
        } else if (effectiveType === '4g' && downlink < 5) {
          setConnectionQuality('good');
        } else if (effectiveType === '4g' && downlink >= 5) {
          setConnectionQuality('excellent');
        }
      } else {
        const startTime = Date.now();
        const response = await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
        if (response.ok || response.status === 404) {
          setIsOnline(true);
          const duration = Date.now() - startTime;
          if (duration < 100) setConnectionQuality('excellent');
          else if (duration < 300) setConnectionQuality('good');
          else if (duration < 750) setConnectionQuality('average');
          else setConnectionQuality('poor');
        }
      }
    } catch {
      setConnectionQuality('unknown');
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check only
    if (navigator.onLine) {
      checkConnection();
    }

    // Check every 60s instead of 30s to reduce overhead
    const intervalId = setInterval(() => {
      if (navigator.onLine) checkConnection();
    }, 60000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return { isOnline, connectionQuality, checkConnection };
};
