import { useEffect, useCallback } from 'react';
import { useSession } from './use-session';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SessionTimeoutProps {
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export const useSessionTimeout = ({ 
  timeoutMinutes = 30, 
  warningMinutes = 5 
}: SessionTimeoutProps = {}) => {
  const { session, isSessionExpired } = useSession();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast.error('Your session has expired. Please log in again.');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [navigate]);

  const handleWarning = useCallback(() => {
    toast.warning(`Your session will expire in ${warningMinutes} minutes`, {
      duration: 10000,
      action: {
        label: "Stay Active",
        onClick: () => {
          // Refresh the session
          supabase.auth.refreshSession();
          toast.success("Session refreshed");
        },
      },
    });
  }, [warningMinutes]);

  useEffect(() => {
    if (!session) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    // Set warning timer
    const warningTimer = setTimeout(handleWarning, warningMs);
    
    // Set logout timer
    const logoutTimer = setTimeout(handleLogout, timeoutMs);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [session, handleLogout, handleWarning, timeoutMinutes, warningMinutes]);

  // Handle expired session from use-session hook
  useEffect(() => {
    if (isSessionExpired && session) {
      handleLogout();
    }
  }, [isSessionExpired, session, handleLogout]);

  return {
    isSessionExpired,
    handleLogout
  };
};