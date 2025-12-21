import { useNetwork } from '@/hooks/use-network';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { Wifi, WifiOff, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export const OfflineAlert = () => {
  const { isOnline, connectionQuality, checkConnection } = useNetwork();
  const { pendingActions: offlineActions, syncPendingActions: syncOfflineActions } = useOfflineMode();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [syncingInBackground, setSyncingInBackground] = useState(false);

  // Default offline features
  const offlineFeatures = {
    appointments: true,
    prescriptions: true,
    payments: false,
    messages: false,
    profile: true,
    search: false
  };

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowBanner(true);
      toast.error("You're offline. Some features will be limited.", {
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

      // If there are offline actions, sync them
      if (offlineActions.length > 0) {
        syncOfflineActionsWithUI();
      }
    }
  }, [isOnline, wasOffline, reconnectAttempts, offlineActions]);

  const syncOfflineActionsWithUI = async () => {
    // Show UI for syncing
    setSyncingInBackground(true);
    try {
      toast.loading(`Syncing ${offlineActions.length} offline changes...`, {
        id: 'sync-toast',
        duration: 3000
      });

      await syncOfflineActions();

      toast.success("All changes synced successfully", {
        id: 'sync-toast',
      });
    } catch (error) {
      toast.error("Some changes failed to sync", {
        id: 'sync-toast',
      });
    } finally {
      setSyncingInBackground(false);
    }
  };

  const handleAttemptReconnect = async () => {
    setReconnectAttempts(prev => prev + 1);

    toast.loading("Checking connection...", {
      id: 'reconnect-toast',
      duration: 2000,
    });

    // Force a connection check
    await checkConnection();

    // Try to refetch any failed resources
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_REQUESTS'
      });
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return "destructive";

    if (connectionQuality === 'poor') {
      return "warning";
    }
    return "success";
  };

  const getConnectionText = () => {
    if (!isOnline) return "You're offline";

    switch (connectionQuality) {
      case 'poor':
        return "Poor connection";
      case 'average':
        return "Average connection";
      case 'good':
        return "Good connection";
      case 'excellent':
        return "Excellent connection";
      default:
        return "Connected";
    }
  };

  if (isOnline && !showBanner) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
      <Sheet>
        <div className={`bg-${getStatusColor()} text-${getStatusColor()}-foreground px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 pointer-events-auto`}>
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {getConnectionText()}
            {offlineActions.length > 0 && ` • ${offlineActions.length} pending changes`}
          </span>

          {!isOnline && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2 bg-transparent border-white/20 hover:bg-white/20 text-white text-xs"
              onClick={handleAttemptReconnect}
            >
              Reconnect
            </Button>
          )}

          {isOnline && offlineActions.length > 0 && !syncingInBackground && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2 bg-transparent border-white/20 hover:bg-white/20 text-white text-xs"
              onClick={syncOfflineActionsWithUI}
            >
              Sync now
            </Button>
          )}

          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full text-white hover:bg-white/20"
            >
              <span className="sr-only">Offline details</span>
              <span className="text-xs">i</span>
            </Button>
          </SheetTrigger>

          <button
            className="ml-2 text-xs underline"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>

        <SheetContent side="bottom" className="rounded-t-xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              {isOnline ?
                <Wifi className="h-5 w-5 mr-2 text-emerald-500" /> :
                <WifiOff className="h-5 w-5 mr-2 text-red-500" />
              }
              {isOnline ? "Online Status" : "Offline Mode"}
            </SheetTitle>
            <SheetDescription>
              {isOnline
                ? "You're currently online. All features are available."
                : "You're currently offline. Some features are limited until you reconnect."
              }
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Available Features</h3>
              <ul className="space-y-2 text-sm">
                {Object.entries(offlineFeatures).map(([feature, available]) => (
                  <li key={feature} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${available ? 'bg-green-500' : 'bg-gray-300'} mr-2`} />
                    <span className="capitalize">{feature}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {available ? 'Available' : 'Limited'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {offlineActions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Pending Changes</h3>
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-muted/50 p-2 text-xs font-medium">
                    Waiting to sync ({offlineActions.length})
                  </div>
                  <ul className="divide-y max-h-32 overflow-y-auto">
                    {offlineActions.slice(0, 5).map((action) => (
                      <li key={action.id} className="p-2 text-xs flex items-center">
                        <span className="capitalize">{action.type.toLowerCase().replace('_', ' ')}</span>
                        <span className="ml-auto text-muted-foreground">
                          {new Date(action.timestamp || '').toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                    {offlineActions.length > 5 && (
                      <li className="p-2 text-xs text-muted-foreground text-center">
                        And {offlineActions.length - 5} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Connection Information</h3>
              <div className="rounded-md border p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Status:</div>
                  <div className="font-medium">
                    {isOnline ? "Online" : "Offline"}
                  </div>

                  <div className="text-muted-foreground">Quality:</div>
                  <div className="font-medium capitalize">
                    {connectionQuality}
                  </div>

                  {isOnline && (
                    <>
                      <div className="text-muted-foreground">Network:</div>
                      <div className="font-medium">
                        {(navigator as any).connection?.type ||
                          (navigator as any).connection?.effectiveType ||
                          "Unknown"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="w-full" size="sm">
                Close
              </Button>
            </SheetClose>

            {!isOnline && (
              <Button
                onClick={handleAttemptReconnect}
                className="w-full"
                size="sm"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Try to Reconnect
              </Button>
            )}

            {isOnline && offlineActions.length > 0 && (
              <Button
                onClick={syncOfflineActionsWithUI}
                className="w-full"
                size="sm"
                disabled={syncingInBackground}
              >
                {syncingInBackground ?
                  "Syncing..." :
                  `Sync ${offlineActions.length} Changes`}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};
