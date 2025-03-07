
import { useState, useEffect } from 'react';

interface NetworkInfo {
  isOnline: boolean;
  connectionType: string | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | null;
  downlink: number | null;
  effectiveType: string | null;
  rtt: number | null;
}

export function useNetwork() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: navigator.onLine,
    connectionType: null,
    connectionQuality: null,
    downlink: null,
    effectiveType: null,
    rtt: null,
  });
  
  useEffect(() => {
    const handleOnline = () => updateNetworkInfo(true);
    const handleOffline = () => updateNetworkInfo(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial network info gathering
    updateNetworkInfo(navigator.onLine);
    
    // Set up connection monitoring if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        const handleConnectionChange = () => {
          updateNetworkInfo(navigator.onLine);
        };
        
        connection.addEventListener('change', handleConnectionChange);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', handleConnectionChange);
        };
      }
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const updateNetworkInfo = (isOnline: boolean) => {
    let connectionType = null;
    let downlink = null;
    let effectiveType = null;
    let rtt = null;
    let connectionQuality = null;
    
    // Get connection information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        connectionType = connection.type;
        downlink = connection.downlink;
        effectiveType = connection.effectiveType;
        rtt = connection.rtt;
        
        // Determine connection quality based on effective type
        if (effectiveType === '4g') {
          connectionQuality = 'excellent';
        } else if (effectiveType === '3g') {
          connectionQuality = 'good';
        } else if (effectiveType === '2g') {
          connectionQuality = 'fair';
        } else if (effectiveType === 'slow-2g') {
          connectionQuality = 'poor';
        }
      }
    }
    
    setNetworkInfo({
      isOnline,
      connectionType,
      connectionQuality,
      downlink,
      effectiveType,
      rtt,
    });
  };
  
  return networkInfo;
}
