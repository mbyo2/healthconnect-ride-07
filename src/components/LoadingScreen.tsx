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
  message = "Preparing Doc' O Clock for emergency healthcare...",
  timeout = 3000 // Reduced for faster initial load feel
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [longWait, setLongWait] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("Initializing emergency healthcare system...");

  // Emergency-focused loading messages
  const emergencyMessages = [
    "Initializing emergency healthcare system...",
    "Securing patient data connections...",
    "Verifying healthcare provider networks...",
    "Preparing emergency response protocols...",
    "Loading healthcare databases...",
    "Establishing secure communications...",
    "Doc' O Clock emergency system ready"
  ];

  useEffect(() => {
    let mounted = true;
    let messageIndex = 0;

    // Cycle through emergency messages
    const messageInterval = setInterval(() => {
      if (mounted && messageIndex < emergencyMessages.length - 1) {
        messageIndex++;
        setCurrentMessage(emergencyMessages[messageIndex]);
      }
    }, 300); // Even faster message cycling

    const fallbackTimer = setTimeout(() => {
      if (mounted) setShowFallback(true);
    }, timeout);

    const longWaitTimer = setTimeout(() => {
      if (mounted) setLongWait(true);
    }, timeout * 1.5);

    const failedTimer = setTimeout(() => {
      if (mounted) setLoadingFailed(true);
    }, timeout * 3);

    // Faster progress for emergency systems
    const progressInterval = setInterval(() => {
      if (mounted) {
        setLoadingProgress(prev => {
          const increment = Math.random() * 20; // Faster progress
          return Math.min(prev + increment, 99);
        });
      }
    }, 150); // More frequent updates

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      clearTimeout(longWaitTimer);
      clearTimeout(failedTimer);
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [timeout]);

  const handleRefresh = useCallback(() => {
    safeSessionRemove('auth-error');
    safeLocalRemove('loading-error');
    window.location.reload();
  }, []);

  const handleClearCacheAndReload = useCallback(() => {
    safeLocalClear();
    safeSessionClear();
    window.location.reload();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      safeLocalClear();
      safeSessionClear();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out from loading screen:', error);
      window.location.reload();
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-8 animate-fadeIn p-10 rounded-2xl bg-white shadow-2xl border border-gray-200 max-w-lg text-center">

        {/* Branded Doc' O Clock Splash Logo */}
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="relative">
            <img 
              src="/d0c-icon.svg" 
              alt="Doc' O Clock" 
              className="w-24 h-24 object-contain shadow-sm" 
            />
            <div className="absolute -inset-4 bg-blue-500 rounded-full blur-2xl opacity-10 -z-10 animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Doc' O Clock
            </h1>
            <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">Emergency Healthcare</p>
          </div>
        </div>

        {/* Modern Loading Spinner */}
        <div className="relative">
          <LoadingSpinner size="lg" className="text-blue-500" />
          <div className="absolute inset-0 animate-ping">
            <LoadingSpinner size="lg" className="text-blue-300 opacity-30" />
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-3">
          <p className="text-lg font-semibold text-gray-800 tracking-tight">{currentMessage}</p>
          <p className="text-sm text-gray-600 italic">"{message}"</p>
        </div>

        {/* Modern Progress Bar */}
        <div className="w-full max-w-[280px]">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 mb-2">
            <span>System Load</span>
            <span>{Math.round(loadingProgress)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-50">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>

        {/* Action Buttons (Appears only on slow/failed load) */}
        {(showFallback || loadingFailed) && (
          <div className="mt-6 text-center space-y-4 w-full">
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleRefresh}
                variant={loadingFailed ? "destructive" : "outline"}
                size="sm"
                className="rounded-full px-8"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Trust indicators at bottom */}
      <div className="absolute bottom-10 flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
        <span>🔒 HIPAA SECURE</span>
        <span className="w-1 h-1 bg-blue-200 rounded-full"></span>
        <span>✓ ZAMBIAN HEALTH NETWORK</span>
      </div>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';
