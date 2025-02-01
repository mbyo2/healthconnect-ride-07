import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

type UserRole = 'admin' | 'health_personnel' | 'patient';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication status...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          toast.error(sessionError.message);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (!session) {
          console.log("No active session found");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log("Session found, checking profile...");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_profile_complete')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile error:", profileError);
          toast.error(profileError.message);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (!profile) {
          console.log("No profile found");
          setIsAuthenticated(true);
          setIsProfileComplete(false);
          setIsLoading(false);
          return;
        }

        setUserRole(profile.role as UserRole);
        setIsProfileComplete(profile.is_profile_complete);
        setIsAuthenticated(true);

        console.log("Auth check complete:", {
          role: profile.role,
          isProfileComplete: profile.is_profile_complete
        });

      } catch (error) {
        console.error("Unexpected error during session check:", error);
        toast.error("Error checking authentication status");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event);
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsProfileComplete(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [location]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isProfileComplete && location.pathname !== '/profile-setup') {
    console.log("Profile incomplete, redirecting to setup");
    toast.info("Please complete your profile first");
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log("User role not allowed:", userRole);
    toast.error("You don't have permission to access this page");
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};