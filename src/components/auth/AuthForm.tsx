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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") {
          navigate("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleRoleSelect = (selectedRole: "patient" | "health_personnel") => {
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
        appearance={{ theme: ThemeSupa }}
        providers={[]}
        redirectTo={`${window.location.origin}/`}
        onlyThirdPartyProviders={false}
        theme="light"
        additionalData={{
          role: role,
        }}
      />
    </div>
  );
};