
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export type RequiredRole = "health_personnel" | "patient" | "admin" | "any";

interface SecureRouteOptions {
  requiredRole?: RequiredRole | RequiredRole[];
  redirectTo?: string;
  adminLevels?: ("admin" | "superadmin")[];
  checkProfileCompletion?: boolean;
}

/**
 * Custom hook to handle secure route redirections based on auth state and roles
 */
export function useSecureRoute(options: SecureRouteOptions = {}) {
  const { 
    requiredRole = "any", 
    redirectTo = "/login", 
    adminLevels = ["admin", "superadmin"],
    checkProfileCompletion = false
  } = options;
  
  const { isAuthenticated, isLoading, profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Not logged in
    if (!isAuthenticated || !user) {
      navigate(redirectTo, { state: { from: location.pathname } });
      setIsAuthorized(false);
      return;
    }

    // Check for role requirements
    if (requiredRole !== "any") {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      
      // For admin role, check admin_level
      if (roles.includes("admin") && (!profile?.admin_level || !adminLevels.includes(profile.admin_level as any))) {
        navigate("/");
        setIsAuthorized(false);
        return;
      }
      
      // For other roles, check profile.role
      if (!profile?.role || !roles.includes(profile.role as any)) {
        navigate("/");
        setIsAuthorized(false);
        return;
      }
    }
    
    // Check for profile completion if needed
    if (checkProfileCompletion && profile && !profile.is_profile_complete) {
      navigate("/profile-setup", { state: { from: location.pathname } });
      setIsAuthorized(false);
      return;
    }
    
    setIsAuthorized(true);
  }, [
    isLoading, isAuthenticated, user, profile, 
    requiredRole, redirectTo, adminLevels, 
    checkProfileCompletion, navigate, location
  ]);

  return { 
    isAuthorized,
    isLoading: isLoading || isAuthorized === null 
  };
}
