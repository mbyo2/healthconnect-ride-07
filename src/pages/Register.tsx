import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@supabase/auth-helpers-react';

const Register = () => {
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    if (session?.user) {
      navigate('/symptoms');
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join our healthcare platform</p>
        </div>
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                  }
                }
              }
            }}
            providers={[]}
            view="sign_up"
            showLinks={true}
            magicLink={false}
            redirectTo={`${window.location.origin}/symptoms`}
          />
        </div>
      </div>
    </div>
  );
};

export default Register;
