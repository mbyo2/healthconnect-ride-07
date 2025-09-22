import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackPath?: string;
  requireAuth?: boolean;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  fallbackPath,
  requireAuth = true
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading while auth is being determined
  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If user is logged in but doesn't have the required role
  if (user && userRole && !allowedRoles.includes(userRole)) {
    // Determine fallback path based on user role
    const getRoleBasedFallback = () => {
      if (fallbackPath) return fallbackPath;
      
      switch (userRole) {
        case 'admin':
          return '/admin-dashboard';
        case 'health_personnel':
          return '/provider-dashboard';
        case 'patient':
        default:
          return '/symptoms';
      }
    };

    return <Navigate to={getRoleBasedFallback()} replace />;
  }

  // If all checks pass, render the component
  return <>{children}</>;
};

export default RoleBasedRoute;
