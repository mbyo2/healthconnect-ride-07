import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SkeletonAppFrame } from "@/components/ui/skeleton-kit";
import { resolveRouteSkeleton } from "@/lib/routeSkeleton";
import { useAuth } from "@/context/AuthContext";
import { safeLocalRemove, safeLocalClear, safeSessionRemove, safeSessionClear } from '@/utils/storage';
import { supabase } from "@/integrations/supabase/client";

interface LoadingScreenProps {
  message?: string;
  timeout?: number;
}

/**
 * Full-screen loading state for route chunks and auth/session gates.
 * YouTube-style: an app-frame skeleton (the shell's header twin —
 * logo, nav, action cluster, matching signed-in/signed-out state —
 * plus page body shapes and the mobile bottom nav) instead of a
 * centred spinner on a blank page, so the layout the user is about
 * to see, header included, is already on screen. This gate replaces
 * MobileLayout entirely while it shows, which is why the frame
 * carries the header itself. The message is announced to assistive
 * tech via role="status"; the slow-load retry is unchanged.
 */
export const LoadingScreen = React.memo<LoadingScreenProps>(({
  message = "Loading...",
  timeout = 2500
}) => {
  const { user } = useAuth();
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

  // Route-matched twin: the page being loaded wears its OWN skeleton
  // (src/lib/routeSkeleton.tsx), not a generic dashboard frame. This
  // component also renders above the Router (main.tsx), so the path
  // comes from window.location rather than a router hook.
  const routeSkeleton =
    typeof window !== "undefined"
      ? resolveRouteSkeleton(window.location.pathname)
      : null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <span role="status" className="sr-only">{message}</span>
      {routeSkeleton && !routeSkeleton.chrome ? (
        // Shell-less screens (kiosk, queue display, video call): the
        // twin owns the whole viewport — no app header/nav shapes.
        routeSkeleton.body
      ) : (
        <SkeletonAppFrame
          variant={user ? "authed" : "guest"}
          body={routeSkeleton?.body}
        />
      )}

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
