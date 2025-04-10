
import { useNetwork } from '@/hooks/use-network';
import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export const OfflineAlert = () => {
  const { isOnline } = useNetwork();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
      toast.error("You're offline. Some features may be unavailable.", {
        id: 'offline-toast',
        duration: Infinity,
        icon: <WifiOff className="h-5 w-5" />
      });
    } else if (wasOffline) {
      setShowBanner(false);
      toast.success("You're back online!", {
        id: 'online-toast',
        duration: 3000,
        icon: <Wifi className="h-5 w-5" />
      });
      toast.dismiss('offline-toast');
      
      // If we've reconnected after attempts, show message
      if (reconnectAttempts > 0) {
        toast.info(`Reconnected after ${reconnectAttempts} attempt${reconnectAttempts > 1 ? 's' : ''}`);
        setReconnectAttempts(0);
      }
    }
  }, [isOnline, wasOffline, reconnectAttempts]);
  
  const handleAttemptReconnect = () => {
    setReconnectAttempts(prev => prev + 1);
    
    // Try to refetch any failed resources
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_REQUESTS'
      });
    }
    
    toast.loading("Attempting to reconnect...", {
      id: 'reconnect-toast',
      duration: 2000,
    });
  };
  
  if (isOnline || !showBanner) return null;
  
  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 pointer-events-auto">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">You're offline</span>
        <Button 
          variant="outline" 
          size="sm"
          className="ml-2 bg-transparent border-white/20 hover:bg-white/20 text-white text-xs"
          onClick={handleAttemptReconnect}
        >
          Reconnect
        </Button>
        <button 
          className="ml-2 text-xs underline" 
          onClick={() => setShowBanner(false)}
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
