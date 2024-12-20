import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfileSetup } from "./ProfileSetup";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"patient" | "health_personnel">("patient");
  const [isLoading, setIsLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Initial session check:", { session, error });
      setIsLoading(false);
      
      if (session?.user) {
        setUser(session.user);
        checkProfileCompletion(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", { event, session });
        
        if (event === "SIGNED_IN") {
          if (session?.user) {
            console.log("User signed in successfully:", session.user);
            setUser(session.user);
            const profileComplete = await checkProfileCompletion(session.user.id);
            if (!profileComplete) {
              setShowProfileSetup(true);
            } else {
              toast.success("Successfully signed in!");
              navigate("/");
            }
          }
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
          setUser(null);
          setShowProfileSetup(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkProfileCompletion = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_profile_complete')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error checking profile completion:", error);
      return false;
    }

    return profile?.is_profile_complete || false;
  };

  const handlePasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent!");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;

      toast.success("Account deleted successfully");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (showProfileSetup) {
    return <ProfileSetup />;
  }

  return (
    <Card className="w-full max-w-md p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="space-y-4">
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: { background: 'rgb(var(--primary))', color: 'white' },
                anchor: { color: 'rgb(var(--primary))' },
              }
            }}
            providers={[]}
            redirectTo={window.location.origin}
            view={activeTab === "signin" ? "sign_in" : "sign_up"}
          />
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => handlePasswordReset(prompt("Enter your email") || "")}
          >
            Forgot Password?
          </Button>
        </TabsContent>

        <TabsContent value="signup" className="space-y-4">
          <div className="mb-6 space-y-4">
            <h2 className="text-2xl font-bold text-center">Sign up as</h2>
            <div className="flex gap-4">
              <Button
                className={`flex-1 ${
                  role === "patient" ? "bg-primary" : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setRole("patient")}
              >
                Patient
              </Button>
              <Button
                className={`flex-1 ${
                  role === "health_personnel"
                    ? "bg-primary"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setRole("health_personnel")}
              >
                Health Personnel
              </Button>
            </div>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: { background: 'rgb(var(--primary))', color: 'white' },
                anchor: { color: 'rgb(var(--primary))' },
              }
            }}
            providers={[]}
            redirectTo={window.location.origin}
            view="sign_up"
          />
        </TabsContent>
      </Tabs>

      {user && (
        <Button
          variant="destructive"
          className="w-full mt-4"
          onClick={handleDeleteAccount}
        >
          Delete Account
        </Button>
      )}
    </Card>
  );
};