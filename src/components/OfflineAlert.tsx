
import { useNetwork } from '@/hooks/use-network';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const OfflineAlert = () => {
  const { isOnline } = useNetwork();
  const [wasOffline, setWasOffline] = useState(false);
  
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      toast.error("You're offline. Some features may be unavailable.", {
        id: 'offline-toast',
        duration: Infinity,
        icon: <WifiOff className="h-5 w-5" />
      });
    } else if (wasOffline) {
      toast.success("You're back online!", {
        id: 'online-toast',
        duration: 3000,
        icon: <Wifi className="h-5 w-5" />
      });
      toast.dismiss('offline-toast');
    }
  }, [isOnline, wasOffline]);
  
  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 pointer-events-auto">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">You're offline</span>
      </div>
    </div>
  );
};
