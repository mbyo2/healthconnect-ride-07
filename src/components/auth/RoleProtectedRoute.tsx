
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { LoadingScreen } from '@/components/LoadingScreen';

type UserRole = 'patient' | 'health_personnel' | 'admin' | 'institution_admin';

interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireProfileComplete?: boolean;
  redirectTo?: string;
}

export const RoleProtectedRoute = ({
  children,
  allowedRoles = [],
  requireProfileComplete = true,
  redirectTo = "/login"
}: RoleProtectedRouteProps) => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const { currentRole, isRoleLoading, canAccessRole } = useUserRoles();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading || isRoleLoading) return;

    // Check authentication first
    if (!isAuthenticated) {
      setIsAuthorized(false);
      return;
    }

    // If no specific roles required, just check authentication
    if (allowedRoles.length === 0) {
      setIsAuthorized(true);
      return;
    }

    // Check role-based authorization
    const hasRequiredRole = allowedRoles.some(role => canAccessRole(role));
    
    if (!hasRequiredRole) {
      setIsAuthorized(false);
      return;
    }
    
    // Check profile completion if required
    if (requireProfileComplete && profile && !profile.is_profile_complete) {
      // Don't set authorized yet, will redirect to profile setup
      setIsAuthorized(false);
      return;
    }
    
    setIsAuthorized(true);
  }, [isLoading, isRoleLoading, isAuthenticated, allowedRoles, canAccessRole, profile, requireProfileComplete]);

  if (isLoading || isRoleLoading) {
    return <LoadingScreen />;
  }

  if (isAuthorized === false) {
    if (!isAuthenticated) {
      // Not logged in - redirect to login
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    
    // Is authenticated but wrong role
    if (allowedRoles.length > 0 && !allowedRoles.some(role => canAccessRole(role))) {
      // Wrong role - redirect to home or dashboard
      return <Navigate to="/home" state={{ from: location }} replace />;
    }
    
    // Profile incomplete
    if (requireProfileComplete && profile && !profile.is_profile_complete) {
      return <Navigate to="/profile-setup" state={{ from: location }} replace />;
    }
    
    // Fallback to login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (isAuthorized === true) {
    return <>{children}</>;
  }

  // Still determining authorization
  return <LoadingScreen />;
};
