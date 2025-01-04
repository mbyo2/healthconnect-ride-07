import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log("User already logged in, redirecting to home");
        navigate("/home");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", { event, session });
      
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in successfully:", session.user);
        toast.success("Successfully signed in!");
        navigate("/home");
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      } else if (event === "USER_UPDATED") {
        console.log("User updated:", session?.user);
      } else if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event received");
        toast.info("Please check your email for password reset instructions");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to Dokotela
          </h1>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              style: {
                button: { background: 'rgb(var(--primary))', color: 'white' },
                anchor: { color: 'rgb(var(--primary))' },
                container: { width: '100%' },
                message: { color: 'rgb(var(--destructive))' },
                input: { 
                  borderRadius: '0.375rem',
                  backgroundColor: 'white' 
                },
                label: { 
                  color: 'rgb(var(--foreground))',
                  fontSize: '0.875rem' 
                }
              },
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/home`}
          />
          <p className="mt-4 text-sm text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;