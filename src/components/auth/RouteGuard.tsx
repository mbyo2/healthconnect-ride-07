import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { hasRoutePermission, getRoleLandingPage, PUBLIC_ROUTES } from '@/utils/rolePermissions';
import { LoadingScreen } from '@/components/LoadingScreen';

interface RouteGuardProps {
  children: React.ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { availableRoles } = useUserRoles();
  const location = useLocation();
  const currentPath = location.pathname;

  // Show loading while auth is being determined
  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  // Allow access to public routes
  if (PUBLIC_ROUTES.includes(currentPath)) {
    return <>{children}</>;
  }

  // Redirect to auth if not authenticated and trying to access protected route
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has permission to access this route
  if (!hasRoutePermission(availableRoles, currentPath)) {
    // Redirect to appropriate dashboard based on role
    const landingPage = getRoleLandingPage(availableRoles);
    return <Navigate to={landingPage} replace />;
  }

  // If all checks pass, render the component
  return <>{children}</>;
};

export default RouteGuard;
