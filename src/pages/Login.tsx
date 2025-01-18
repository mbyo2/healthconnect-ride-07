import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AuthError } from "@supabase/supabase-js";

const Login = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Checking existing session...");
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error checking session:", error);
        setError(getErrorMessage(error));
        return;
      }
      
      if (session) {
        console.log("User already logged in, redirecting to home");
        navigate("/home");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", { event, session });
      
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in successfully:", session.user);
        toast.success("Welcome to your healthcare portal!");
        navigate("/home");
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setError(null);
      } else if (event === "USER_UPDATED") {
        console.log("User updated:", session?.user);
      } else if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery event received");
        toast.info("Please check your email for password reset instructions");
      } else if (event === "USER_DELETED") {
        console.log("User account deleted");
        toast.info("Your account has been deleted");
        navigate("/login");
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Session token refreshed");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: AuthError): string => {
    switch (error.message) {
      case "Invalid login credentials":
        return "Invalid email or password. Please try again.";
      case "Email not confirmed":
        return "Please verify your email address before signing in.";
      case "User not found":
        return "No account found with these credentials.";
      case "Too many requests":
        return "Too many attempts. Please try again later.";
      default:
        return error.message;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-full">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome to Your Health Portal
          </h1>
          <p className="text-muted-foreground">
            Access your healthcare services securely
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6 shadow-lg">
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
        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Your health information is protected by industry-standard encryption
          </p>
          <div className="text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;