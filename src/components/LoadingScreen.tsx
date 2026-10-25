import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SkeletonAppFrame } from "@/components/ui/skeleton-kit";
import { safeLocalRemove, safeLocalClear, safeSessionRemove, safeSessionClear } from '@/utils/storage';
import { supabase } from "@/integrations/supabase/client";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

/**
 * Full-screen loading state for route chunks and auth/session gates.
 * YouTube-style: an app-frame skeleton (header bar + page body shapes)
 * instead of a centred spinner on a blank page, so the layout the user
 * is about to see is already on screen. The message is announced to
 * assistive tech via role="status"; the slow-load retry is unchanged.
 */
export const LoadingScreen = React.memo<LoadingScreenProps>(({
  message = "Loading...",
  timeout = 2500
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
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <span role="status" className="sr-only">{message}</span>
      <SkeletonAppFrame />

      {showRetry && (
        <div className="fixed inset-x-0 bottom-8 flex justify-center animate-fade-in">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="shadow-lg">
            Taking too long? Retry
          </Button>
        </div>
      )}
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';
