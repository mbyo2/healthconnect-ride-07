
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import type { AuthSession } from '@supabase/supabase-js';

interface AuthFormProps {
  mode?: 'login' | 'register';
}

export const AuthForm = ({ mode = 'login' }: AuthFormProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      setSession(session);
      navigate('/profile');
    }
  });

  return (
    <div className="max-w-md mx-auto p-4">
      <Auth
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={['google', 'github']}
        view={mode === 'register' ? 'sign_up' : 'sign_in'}
      />
    </div>
  );
};
