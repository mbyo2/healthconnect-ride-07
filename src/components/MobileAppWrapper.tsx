
import { useEffect, useState, useRef } from 'react';
import { useDeviceCapabilities } from '@/hooks/use-device-capabilities';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BatteryLow } from 'lucide-react';
import { toast } from 'sonner';

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

export function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const capabilities = useDeviceCapabilities();
  const { session } = useAuth();
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const hasRequestedPermissions = useRef(false);
  const batteryWarningShown = useRef(false);

  const batteryLevel = capabilities.battery.level;
  const batteryCharging = capabilities.battery.charging;
  const isOnline = capabilities.network.isOnline;

  // Battery warning - use primitive deps only
  useEffect(() => {
    if (batteryLevel !== null && batteryLevel <= 0.15 && !batteryCharging && !batteryWarningShown.current) {
      setLowPowerMode(true);
      batteryWarningShown.current = true;
      toast.warning("Battery is low. Enabling power saving mode.", { duration: 5000 });
    } else if (batteryLevel !== null && (batteryLevel > 0.15 || batteryCharging) && batteryWarningShown.current) {
      setLowPowerMode(false);
      batteryWarningShown.current = false;
    }
  }, [batteryLevel, batteryCharging]);

  // Request permissions once when logged in
  useEffect(() => {
    if (session && !hasRequestedPermissions.current && capabilities.isCapacitor) {
      hasRequestedPermissions.current = true;
      capabilities.requestPermission('notifications').then((granted) => {
        if (!granted) {
          toast.info("Please enable notifications for appointment reminders");
        }
      });
    }
  }, [session, capabilities.isCapacitor, capabilities.requestPermission]);

  // Offline toast
  useEffect(() => {
    if (!isOnline) {
      toast.error("You're offline. Some features may be limited.", {
        duration: 0,
        id: "offline-toast"
      });
    } else {
      toast.dismiss("offline-toast");
    }
  }, [isOnline]);

  return (
    <div className={lowPowerMode ? 'low-power-mode' : ''}>
      {batteryLevel !== null && batteryLevel <= 0.1 && !batteryCharging && (
        <Alert className="mb-2 border-destructive/30 bg-destructive/10 sticky top-0 z-50">
          <BatteryLow className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive flex items-center justify-between">
            <span>Battery critically low ({Math.round(batteryLevel * 100)}%)</span>
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
        <style dangerouslySetInnerHTML={{
          __html: `
            .low-power-mode * {
              transition: none !important;
              animation: none !important;
            }
            .low-power-mode .dark {
              --background: 0 0% 0%;
              --card: 0 0% 4%;
            }
          `
        }} />
      )}
    </div>
  );
}
