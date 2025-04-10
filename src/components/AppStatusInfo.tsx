
import { useEffect, useState } from 'react';
import { useNetwork } from "@/hooks/use-network";
import { AlertCircle, Check, Wifi, WifiOff, Download } from "lucide-react";
import { Button } from '@/components/ui/button';
import { checkIfAppInstalled, checkServiceWorkerStatus } from '@/utils/service-worker';
import { Badge } from '@/components/ui/badge';

export function AppStatusInfo() {
  const { isOnline } = useNetwork();
  const [swActive, setSwActive] = useState<boolean | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  
  useEffect(() => {
    const checkStatus = async () => {
      const serviceWorkerActive = await checkServiceWorkerStatus();
      setSwActive(serviceWorkerActive);
      setIsInstalled(checkIfAppInstalled());
    };
    
    checkStatus();
  }, []);
  
  if (!showBanner) return null;
  
  return (
    <div className="mb-4 p-3 bg-card rounded-lg border text-sm animate-fadeIn">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium">App Status</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowBanner(false)}>
          Close
        </Button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          <span>Network: {isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {swActive === null ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : swActive ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span>Offline Mode: {swActive ? 'Available' : 'Not Available'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Download className="h-4 w-4 text-blue-500" />
          )}
          <span>Installation: {isInstalled ? 'Installed' : 'Not Installed'}</span>
        </div>
        
        {!swActive && (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Refreshing the page may enable offline mode
          </Badge>
        )}
      </div>
    </div>
  );
}
