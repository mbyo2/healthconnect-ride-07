import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OfflineBanner = () => {
  const { isOnline, pendingCount, syncing, syncAll } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`px-4 py-2 flex items-center justify-between text-sm ${
      isOnline ? 'bg-amber-100 text-amber-800' : 'bg-destructive/10 text-destructive'
    }`}>
      <div className="flex items-center gap-2">
        {!isOnline && <WifiOff className="h-4 w-4" />}
        {!isOnline ? (
          <span>You're offline. Changes will sync when reconnected.</span>
        ) : (
          <span>{pendingCount} pending change{pendingCount !== 1 ? 's' : ''} to sync</span>
        )}
      </div>
      {isOnline && pendingCount > 0 && (
        <Button size="sm" variant="outline" onClick={syncAll} disabled={syncing} className="gap-1">
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
          Sync Now
        </Button>
      )}
    </div>
  );
};
