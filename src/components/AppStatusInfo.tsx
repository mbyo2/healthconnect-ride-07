
import { useEffect, useState } from 'react';
import { useNetwork } from "@/hooks/use-network";
import { AlertCircle, Check, Wifi, WifiOff, Download, Fingerprint } from "lucide-react";
import { Button } from '@/components/ui/button';
import { checkIfAppInstalled, checkServiceWorkerStatus, updateServiceWorker, clearCache } from '@/utils/service-worker';
import { Badge } from '@/components/ui/badge';
import { usePwaStatus } from '@/hooks/use-pwa-status';
import { verifyBiometricSupport } from '@/utils/auth-service';
import { toast } from 'sonner';

export function AppStatusInfo() {
  const { isOnline } = useNetwork();
  const [biometricsSupported, setBiometricsSupported] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const pwaStatus = usePwaStatus();
  
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const { supported } = await verifyBiometricSupport();
        setBiometricsSupported(supported);
      } catch (error) {
        console.error('Error checking biometrics:', error);
        setBiometricsSupported(false);
      }
    };
    
    checkBiometrics();
  }, []);
  
  const handleUpdateServiceWorker = async () => {
    const updated = await updateServiceWorker();
    if (updated) {
      toast.success('App updated! Refresh to see changes.');
    } else {
      toast.info('No updates available.');
    }
  };
  
  const handleClearCache = async () => {
    const cleared = await clearCache();
    if (cleared) {
      toast.success('Cache cleared successfully.');
    } else {
      toast.error('Failed to clear cache.');
    }
  };
  
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
          {pwaStatus.isServiceWorkerActive === null ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : pwaStatus.isServiceWorkerActive ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          <span>Offline Mode: {pwaStatus.isServiceWorkerActive ? 'Available' : 'Not Available'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {pwaStatus.isInstalled ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Download className="h-4 w-4 text-blue-500" />
          )}
          <span>Installation: {pwaStatus.isInstalled ? 'Installed' : 'Not Installed'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {biometricsSupported === null ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : biometricsSupported ? (
            <Fingerprint className="h-4 w-4 text-green-500" />
          ) : (
            <Fingerprint className="h-4 w-4 text-gray-400" />
          )}
          <span>Biometrics: {biometricsSupported ? 'Supported' : biometricsSupported === null ? 'Checking...' : 'Not Supported'}</span>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {!pwaStatus.isServiceWorkerActive && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Refreshing the page may enable offline mode
            </Badge>
          )}
          
          {pwaStatus.isServiceWorkerActive && (
            <Button variant="outline" size="sm" onClick={handleUpdateServiceWorker}>
              Check for updates
            </Button>
          )}
          
          {pwaStatus.cachingComplete && (
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              Clear cache
            </Button>
          )}
          
          {!pwaStatus.isInstalled && pwaStatus.canInstall && (
            <Button variant="outline" size="sm" onClick={pwaStatus.promptInstall}>
              Install app
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
