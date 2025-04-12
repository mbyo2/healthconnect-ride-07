
import { useState, useEffect } from 'react';

export interface NetworkState {
  isOnline: boolean;
  connectionQuality: 'poor' | 'average' | 'good' | 'excellent' | 'unknown';
}

export const useNetwork = (): NetworkState => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<NetworkState['connectionQuality']>('unknown');

  useEffect(() => {
    // Network status change handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Check connection quality
    const checkConnectionQuality = async () => {
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
          
          // Also listen for connection changes
          (navigator as any).connection.addEventListener('change', checkConnectionQuality);
        } else {
          // Fall back to ping test if Network Information API not available
          const startTime = Date.now();
          const response = await fetch('/favicon.ico', { 
            method: 'HEAD',
            cache: 'no-cache',
          });
          
          if (response.ok) {
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
          }
        }
      } catch (error) {
        console.error('Error checking connection quality:', error);
        // If online but had an error checking quality, assume average
        if (isOnline) {
          setConnectionQuality('average');
        } else {
          setConnectionQuality('unknown');
        }
      }
    };

    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    if (isOnline) {
      checkConnectionQuality();
      
      // Periodically check connection quality (every 30 seconds)
      const intervalId = setInterval(() => {
        if (navigator.onLine) {
          checkConnectionQuality();
        }
      }, 30000);
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        
        if ('connection' in navigator && (navigator as any).connection) {
          (navigator as any).connection.removeEventListener('change', checkConnectionQuality);
        }
      };
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, connectionQuality };
};
