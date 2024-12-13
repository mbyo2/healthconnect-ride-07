import { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const AuthForm = () => {
  const [userType, setUserType] = useState<"patient" | "health_personnel" | null>(
    null
  );
  const navigate = useNavigate();

  // Check if user is already logged in
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session) {
      navigate("/");
      toast.success("Welcome!", {
        description: "You have successfully signed in.",
      });
    }
  });

  if (!userType) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">Join Dokotela</h2>
        <p className="text-center text-gray-600">Choose your account type:</p>
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => setUserType("patient")}
          >
            I'm a Patient
          </Button>
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={() => setUserType("health_personnel")}
          >
            I'm a Healthcare Provider
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setUserType(null)}
        >
          ← Back
        </Button>
        <h2 className="text-2xl font-bold">
          Sign up as a {userType === "patient" ? "Patient" : "Healthcare Provider"}
        </h2>
      </div>
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "#0077CC",
                brandAccent: "#00A3C4",
              },
            },
          },
        }}
        providers={[]}
        redirectTo={`${window.location.origin}/auth/callback`}
        queryParams={{
          options: {
            data: {
              role: userType,
            },
          },
        }}
      />
    </Card>
  );
};