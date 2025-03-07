
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const InstitutionPortal = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          setError(error.message);
          return;
        }
        
        if (session) {
          console.log("Institution already logged in, checking profile...");
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
          
          // Check if this is a healthcare institution account
          const { data: institutionCheck, error: instCheckError } = await supabase
            .from('healthcare_institutions')
            .select('admin_id')
            .eq('admin_id', session.user.id)
            .single();
            
          if (instCheckError && instCheckError.code !== 'PGRST116') {
            console.error("Error checking institution status:", instCheckError);
          }
            
          if (institutionCheck) {
            // Check if the institution has an approved registration
            const { data: institution, error: institutionError } = await supabase
              .from('healthcare_institutions')
              .select('is_verified')
              .eq('admin_id', session.user.id)
              .single();
              
            if (institutionError && institutionError.code !== 'PGRST116') {
              console.error("Error checking institution status:", institutionError);
              toast.error("Error checking institution status");
              setIsLoading(false);
              return;
            }
            
            if (institution?.is_verified) {
              navigate("/institution-dashboard");
            } else {
              // If institution is not verified, redirect to status page
              navigate("/institution-status");
            }
          } else {
            // Not an institution admin
            toast.error("You don't have institution access");
            navigate("/login");
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
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Healthcare Institution Portal
          </h1>
          <p className="text-muted-foreground">
            Manage your healthcare institution and services
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-4">
          <AlertDescription>
            <strong>Note:</strong> Healthcare institutions require verification by an administrator before all features are accessible.
          </AlertDescription>
        </Alert>

        <Card className="p-6 shadow-lg">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
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
                view="sign_in"
                redirectTo={`${window.location.origin}/institution-dashboard`}
              />
            </TabsContent>
            
            <TabsContent value="signup">
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
                view="sign_up"
                redirectTo={`${window.location.origin}/institution-registration`}
              />
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Register your hospital, clinic, nursing home, or other healthcare facility
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
