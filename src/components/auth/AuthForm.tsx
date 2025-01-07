import { useState } from "react";
import { useRouter } from "next/router";
import { Auth } from "@supabase/ui";
import { supabase } from "@/integrations/supabase/client";

const AuthForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAuthStateChange = (event: AuthChangeEvent, session: Session | null) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
      // Handle successful sign in/up
      router.push('/profile-setup');
    }
  };

  const { user, error } = Auth.useUser();

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome to the App</h1>
      <Auth
        supabaseClient={supabase}
        providers={['google', 'github']}
        socialLayout="horizontal"
        view="sign_in"
        onAuthStateChange={handleAuthStateChange}
      />
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
};

export default AuthForm;
