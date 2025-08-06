import { useEffect } from 'react';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useSession } from '@/hooks/use-session';

interface SessionManagerProps {
  children: React.ReactNode;
}

export const SessionManager = ({ children }: SessionManagerProps) => {
  const { session } = useSession();
  
  // Initialize session timeout management for authenticated users
  useSessionTimeout({
    timeoutMinutes: 30, // 30 minute timeout
    warningMinutes: 5   // Show warning 5 minutes before expiry
  });

  // Activity tracking for session refresh
  useEffect(() => {
    if (!session) return;

    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    let lastActivity = Date.now();

    const handleActivity = () => {
      const now = Date.now();
      // Only refresh if 5 minutes have passed since last activity
      if (now - lastActivity > 5 * 60 * 1000) {
        lastActivity = now;
        // Extend session on user activity
        import('@/integrations/supabase/client').then(({ supabase }) => {
          supabase.auth.refreshSession();
        });
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session]);

  return <>{children}</>;
};