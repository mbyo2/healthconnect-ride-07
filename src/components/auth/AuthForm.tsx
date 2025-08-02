
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import type { AuthSession } from '@supabase/supabase-js';
import { logSecurityEvent, SecurityEvents, authRateLimiter } from '@/utils/security-service';
import { toast } from 'sonner';

interface AuthFormProps {
  mode?: 'login' | 'register';
}

export const AuthForm = ({ mode = 'login' }: AuthFormProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const userIp = session?.user?.id || 'anonymous';
      
      if (event === 'SIGNED_IN' && session) {
        // Check rate limiting
        if (!authRateLimiter(userIp)) {
          setRateLimitExceeded(true);
          toast.error('Too many login attempts. Please try again later.');
          await supabase.auth.signOut();
          return;
        }

        await logSecurityEvent(SecurityEvents.LOGIN_SUCCESS, {
          userId: session.user.id,
          provider: session.user.app_metadata?.provider,
        });
        
        setSession(session);
        navigate('/profile');
      } else if (event === 'SIGNED_OUT') {
        await logSecurityEvent(SecurityEvents.LOGOUT, {
          userId: session?.user?.id,
        });
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto p-4">
      {rateLimitExceeded && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">
            Too many authentication attempts. Please wait before trying again.
          </p>
        </div>
      )}
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        view={mode === 'register' ? 'sign_up' : 'sign_in'}
        onlyThirdPartyProviders={false}
        magicLink={false}
        socialLayout="horizontal"
        redirectTo={`${window.location.origin}/`}
      />
    </div>
  );
};
