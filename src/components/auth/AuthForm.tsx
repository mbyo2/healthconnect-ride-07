import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const AuthForm = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"patient" | "health_personnel">("patient");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", session);
      if (session) {
        console.log("User already logged in, redirecting to home");
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session);
        if (event === "SIGNED_IN") {
          console.log("User signed in successfully");
          toast.success("Successfully signed in!");
          navigate("/");
        } else if (event === "SIGNED_OUT") {
          console.log("User signed out");
        } else if (event === "USER_UPDATED") {
          console.log("User updated");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleRoleSelect = (selectedRole: "patient" | "health_personnel") => {
    console.log("Role selected:", selectedRole);
    setRole(selectedRole);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="mb-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Sign up as</h2>
        <div className="flex gap-4">
          <Button
            className={`flex-1 ${
              role === "patient" ? "bg-primary" : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => handleRoleSelect("patient")}
          >
            Patient
          </Button>
          <Button
            className={`flex-1 ${
              role === "health_personnel"
                ? "bg-primary"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => handleRoleSelect("health_personnel")}
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
        onlyThirdPartyProviders={false}
        theme="light"
        showLinks={true}
        view="sign_in"
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email',
              password_label: 'Password',
            },
          },
        }}
        additionalData={{
          role: role,
        }}
      />
    </div>
  );
};