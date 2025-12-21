
import { useState, useEffect } from 'react';

export interface NetworkState {
  isOnline: boolean;
  connectionQuality: 'poor' | 'average' | 'good' | 'excellent' | 'unknown';
  checkConnection: () => Promise<void>;
}

export const useNetwork = (): NetworkState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<NetworkState['connectionQuality']>('unknown');

  const checkConnection = async () => {
    try {
      // If Network Information API is available (Chrome, Android)
      if ('connection' in navigator && (navigator as any).connection) {
        const { effectiveType, downlink, rtt } = (navigator as any).connection;

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setConnectionQuality('poor');
        } else if (effectiveType === '3g') {
          setConnectionQuality('average');
        } else if (effectiveType === '4g' && downlink < 5) {
          setConnectionQuality('good');
        } else if (effectiveType === '4g' && downlink >= 5) {
          setConnectionQuality('excellent');
        }

        // If we have connection info, we are likely online
        if (navigator.onLine) {
          setIsOnline(true);
        }
      } else {
        // Fall back to ping test if Network Information API not available
        const startTime = Date.now();
        const response = await fetch('/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
        });

        if (response.ok || response.status === 404) {
          // If we get a response (even 404), we are online
          setIsOnline(true);

          const duration = Date.now() - startTime;

          if (duration < 100) {
            setConnectionQuality('excellent');
          } else if (duration < 300) {
            setConnectionQuality('good');
          } else if (duration < 750) {
            setConnectionQuality('average');
          } else {
            setConnectionQuality('poor');
          }
        } else {
          // Response not OK and not 404 might indicate issue, but strictly speaking we reached server
          // But if fetch throws, it goes to catch
          setIsOnline(true);
        }
      }
    } catch (error) {
      console.error('Error checking connection quality:', error);
      // If fetch fails completely, we might be offline
      // But only set offline if navigator also thinks so, or if we want to be strict
      // For now, let's trust navigator.onLine primarily, but if ping fails, maybe we are offline?
      // Actually, if ping fails, it's a strong indicator of offline.

      // However, to avoid false positives due to server issues, let's only set offline if navigator agrees
      // OR if we are explicitly checking.

      // Let's keep isOnline as is, but set quality to unknown
      if (isOnline) {
        setConnectionQuality('unknown');
      }
    }
  };

  useEffect(() => {
    // Network status change handlers
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };
    const handleOffline = () => setIsOnline(false);

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      checkConnection();
    }

    // Periodically check connection quality (every 30 seconds)
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionQuality, checkConnection };
};
