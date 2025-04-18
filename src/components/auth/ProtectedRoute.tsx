
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { UserRole, AdminLevel } from "@/types/user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
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
          toast.error("Session error. Please log in again.");
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

        // Refresh session if it exists
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error("Session refresh error:", refreshError);
          toast.error("Session expired. Please log in again.");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        if (!refreshedSession) {
          console.log("Session refresh failed");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        console.log("Session found, checking profile...");
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_profile_complete, admin_level')
          .eq('id', refreshedSession.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile error:", profileError);
          toast.error("Error loading profile");
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

        // Check if profile is an object with the expected properties
        if (profile && typeof profile === 'object') {
          setUserRole(profile.role as UserRole);
          setAdminLevel(profile.admin_level as AdminLevel);
          setIsProfileComplete(profile.is_profile_complete);
          setIsAuthenticated(true);

          console.log("Auth check complete:", {
            role: profile.role,
            adminLevel: profile.admin_level,
            isProfileComplete: profile.is_profile_complete
          });
        } else {
          console.log("Profile data is not in expected format");
          setIsAuthenticated(true);
          setIsProfileComplete(false);
        }

      } catch (error) {
        console.error("Unexpected error during session check:", error);
        toast.error("Error checking authentication status");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserRole(null);
        setAdminLevel(null);
        setIsProfileComplete(null);
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        
        // Defer fetching profile data to avoid blocking the UI
        setTimeout(async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_profile_complete, admin_level')
            .eq('id', session.user.id)
            .single();
          
          if (profile && typeof profile === 'object') {
            setUserRole(profile.role as UserRole);
            setAdminLevel(profile.admin_level as AdminLevel);
            setIsProfileComplete(profile.is_profile_complete);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [location]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isProfileComplete && location.pathname !== '/profile-setup') {
    console.log("Profile incomplete, redirecting to setup");
    toast.info("Please complete your profile first");
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  // Special case for superadmin dashboard - only superadmins can access
  if (location.pathname === '/superadmin-dashboard' && adminLevel !== 'superadmin') {
    console.log("Not a superadmin, redirecting from superadmin dashboard");
    toast.error("You don't have permission to access this page");
    return <Navigate to="/" replace />;
  }

  // Superadmins can access any page
  if (adminLevel === 'superadmin') {
    console.log("User is superadmin, allowing access to all pages");
    return <>{children}</>;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log("User role not allowed:", userRole);
    toast.error("You don't have permission to access this page");
    return <Navigate to="/symptoms" replace />;
  }

  // Return just the children
  return <>{children}</>;
};
