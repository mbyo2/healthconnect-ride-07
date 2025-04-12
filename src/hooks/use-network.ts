
import { useState, useEffect, useCallback } from 'react';

type NetworkStatus = {
  isOnline: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  downlink: number;
  rtt: number;
  saveData: boolean;
};

export function useNetwork() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });
  
  const [connectionQuality, setConnectionQuality] = useState<'poor' | 'average' | 'good' | 'excellent' | 'unknown'>('unknown');

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      setNetworkStatus({
        isOnline: navigator.onLine,
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      });
      
      // Determine connection quality
      const { effectiveType, downlink, rtt } = connection;
      
      if (!effectiveType || effectiveType === 'slow-2g') {
        setConnectionQuality('poor');
      } else if (effectiveType === '2g' || (downlink && downlink < 0.5)) {
        setConnectionQuality('poor');
      } else if (effectiveType === '3g' || (downlink && downlink < 2)) {
        setConnectionQuality('average');
      } else if (effectiveType === '4g' && downlink >= 2 && downlink < 5) {
        setConnectionQuality('good');
      } else if (effectiveType === '4g' && downlink >= 5) {
        setConnectionQuality('excellent');
      } else {
        setConnectionQuality('unknown');
      }
    } else {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: navigator.onLine
      }));
    }
  }, []);

  useEffect(() => {
    updateNetworkInfo();

    // Event listeners for connection changes
    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);
    
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
                       
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', updateNetworkInfo);
      window.removeEventListener('offline', updateNetworkInfo);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  // Function to retry failed requests when coming back online
  const retryFailedRequests = useCallback(() => {
    if (networkStatus.isOnline && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_REQUESTS'
      });
    }
  }, [networkStatus.isOnline]);

  // Automatically retry requests when coming back online
  useEffect(() => {
    if (networkStatus.isOnline) {
      retryFailedRequests();
    }
  }, [networkStatus.isOnline, retryFailedRequests]);

  return { 
    ...networkStatus, 
    connectionQuality,
    retryFailedRequests
  };
}
