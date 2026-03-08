import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { safeLocalRemove, safeLocalClear, safeSessionRemove, safeSessionClear } from '@/utils/storage';
import { supabase } from "@/integrations/supabase/client";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

export const LoadingScreen = React.memo<LoadingScreenProps>(({
  message = "Loading...",
  timeout = 4000
}) => {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), timeout);
    return () => clearTimeout(timer);
  }, [timeout]);

  const handleRefresh = useCallback(() => {
    safeSessionRemove('auth-error');
    safeLocalRemove('loading-error');
    window.location.reload();
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
        <img src="/d0c-icon.svg" alt="Doc' O Clock" className="w-16 h-16 object-contain" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Doc' O Clock</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <LoadingSpinner size="lg" className="text-primary" />

        {showRetry && (
          <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-4">
            Taking too long? Retry
          </Button>
        )}
      </div>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';
