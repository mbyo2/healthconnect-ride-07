
import { useEffect, useState } from 'react';
import { useDeviceCapabilities } from '@/hooks/use-device-capabilities';
import { useSession } from '@/hooks/use-session';
import { useNetwork } from '@/hooks/use-network';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Battery, BatteryLow, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

export function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const capabilities = useDeviceCapabilities();
  const { isOnline } = useNetwork();
  const { session } = useSession();
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  // App behavior for low battery
  useEffect(() => {
    if (capabilities.battery.level !== null && capabilities.battery.level <= 0.15 && !capabilities.battery.charging) {
      setLowPowerMode(true);
      toast.warning("Battery is low. Enabling power saving mode.", {
        duration: 5000,
      });
    } else if (capabilities.battery.level !== null && (capabilities.battery.level > 0.15 || capabilities.battery.charging)) {
      setLowPowerMode(false);
    }
  }, [capabilities.battery]);

  // Request necessary permissions when logged in
  useEffect(() => {
    const requestPermissions = async () => {
      if (session && !hasRequestedPermissions && capabilities.isCapacitor) {
        setHasRequestedPermissions(true);
        
        // Request critical permissions for app functionality
        const notificationPermission = await capabilities.requestPermission('notifications');
        if (!notificationPermission) {
          toast.info("Please enable notifications for appointment reminders", {
            action: {
              label: "Enable",
              onClick: () => capabilities.requestPermission('notifications')
            }
          });
        }
      }
    };
    
    requestPermissions();
  }, [session, hasRequestedPermissions, capabilities]);

  // Handle app going offline
  useEffect(() => {
    if (!isOnline) {
      toast.error("You're offline. Some features may be limited.", {
        duration: 0, // Won't dismiss until online again
        id: "offline-toast"
      });
    } else {
      toast.dismiss("offline-toast");
    }
  }, [isOnline]);

  return (
    <div className={`${lowPowerMode ? 'low-power-mode' : ''}`}>
      {capabilities.battery.level !== null && capabilities.battery.level <= 0.1 && !capabilities.battery.charging && (
        <Alert className="mb-2 border-red-300 bg-red-50 dark:bg-red-900/20 sticky top-0 z-50">
          <BatteryLow className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>Battery critically low ({Math.round(capabilities.battery.level * 100)}%)</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLowPowerMode(prev => !prev)}
              className="text-xs"
            >
              {lowPowerMode ? "Disable" : "Enable"} Power Saving
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {children}
      
      {capabilities.isCapacitor && (
        <style jsx global>{`
          .low-power-mode {
            /* Reduce animations */
            * {
              transition: none !important;
              animation: none !important;
            }
            /* Use darker colors for OLED screens */
            .dark {
              --background: #000000;
              --card: #0a0a0a;
            }
          }
        `}</style>
      )}
    </div>
  );
}
