
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Heart, Building2, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("Checking existing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          setError(error.message);
          return;
        }
        
        if (session) {
          console.log("User already logged in, checking profile completion...");
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_profile_complete, role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
            return;
          }

          setIsRedirecting(true);
          
          if (!profile?.is_profile_complete) {
            console.log("Profile incomplete, redirecting to setup...");
            navigate("/profile-setup");
          } else {
            console.log("Profile complete, redirecting to symptoms page...");
            navigate("/symptoms");
          }
        }
      } catch (err) {
        console.error("Unexpected error during session check:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session);
      
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in successfully:", session.user);
        setIsRedirecting(true);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_profile_complete, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Error fetching profile");
          return;
        }

        if (!profile?.is_profile_complete) {
          navigate("/profile-setup");
          toast.info("Please complete your profile");
        } else {
          toast.success("Welcome back!");
          switch (profile.role) {
            case 'health_personnel':
              navigate("/provider-dashboard");
              break;
            case 'admin':
              navigate("/admin-dashboard");
              break;
            default:
              navigate("/home");
          }
        }
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setError(null);
        setIsRedirecting(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <LoadingScreen />
      </div>
    );
  }

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
            Welcome to Doc&apos; O Clock
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

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Button variant="outline" asChild className="flex flex-col h-auto py-4">
            <Link to="/provider-portal">
              <User className="h-5 w-5 mb-2" />
              <span>Healthcare Provider Portal</span>
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="flex flex-col h-auto py-4">
            <Link to="/institution-portal">
              <Building2 className="h-5 w-5 mb-2" />
              <span>Institution Portal</span>
            </Link>
          </Button>
        </div>

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
