
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { verifyBiometricSupport } from '@/utils/auth-service';

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState<boolean | null>(null);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
    setIsSessionExpired(false);
  }, []);

  // Check if biometrics is supported
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const { supported } = await verifyBiometricSupport();
        setHasBiometrics(supported);
      } catch (error) {
        console.error('Error checking biometrics:', error);
        setHasBiometrics(false);
      }
    };
    
    checkBiometrics();
  }, []);

  // Set up session activity monitoring
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => updateActivity();

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check session timeout every minute
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const intervalId = setInterval(() => {
      if (session && new Date().getTime() - lastActivity.getTime() > sessionTimeout) {
        setIsSessionExpired(true);
        toast.warning("Your session is about to expire due to inactivity", {
          action: {
            label: "Keep active",
            onClick: updateActivity,
          },
        });
      }
    }, 60000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [lastActivity, session, updateActivity]);

  // Set up Supabase auth listener
  useEffect(() => {
    async function getSession() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(data.session);
          setUser(data.session?.user || null);
          
          if (data.session) {
            updateActivity();
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    }

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        
        if (session) {
          updateActivity();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [updateActivity]);

  // Refresh session token periodically
  useEffect(() => {
    // Only set up token refresh if we have an active session
    if (!session) return;

    // Refresh token 5 minutes before expiry
    const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const timeUntilExpiry = expiresAt - Date.now();
    const refreshTime = Math.max(0, timeUntilExpiry - refreshBuffer);

    // Set timeout to refresh token
    const refreshTimeout = setTimeout(async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw error;
        
        setSession(data.session);
        setUser(data.session?.user || null);
        updateActivity();
      } catch (err) {
        console.error('Failed to refresh session:', err);
        // Let the user know they might need to re-login
        toast.error('Your session has expired. Please log in again.');
        setIsSessionExpired(true);
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimeout);
  }, [session, updateActivity]);

  return { 
    session, 
    isLoading, 
    user, 
    hasBiometrics,
    isSessionExpired,
    refreshSession: updateActivity
  };
};
