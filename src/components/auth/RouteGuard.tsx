import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { hasRoutePermission, getRoleLandingPage, PUBLIC_ROUTES } from '@/utils/rolePermissions';
import { LoadingScreen } from '@/components/LoadingScreen';

interface RouteGuardProps {
  children: React.ReactNode;
  /**
   * Optional explicit role allowlist. If provided, the user must have at least
   * one of these roles to access the route, regardless of the global
   * rolePermissions matrix. Use for highly sensitive routes (e.g. superadmin).
   */
  requireRoles?: string[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, requireRoles }) => {
  const { user, loading: authLoading } = useAuth();
  const { availableRoles, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const hasRequiredRole = !requireRoles || requireRoles.some(r => availableRoles.includes(r as any));

  useEffect(() => {
    // Only run checks after loading is complete
    if (authLoading || rolesLoading) return;

    // Allow access to public routes
    if (PUBLIC_ROUTES.includes(currentPath)) {
      return;
    }

    // Redirect to auth if not authenticated
    if (!user) {
      if (currentPath !== '/auth') {
        console.log(`RouteGuard: Not authenticated, redirecting to /auth from ${currentPath}`);
        navigate('/auth', { replace: true, state: { from: location } });
      }
      return;
    }

    // Explicit role allowlist takes priority
    if (requireRoles && !hasRequiredRole) {
      const landingPage = getRoleLandingPage(availableRoles);
      console.warn(`RouteGuard: role-restricted route ${currentPath} blocked. Required: ${requireRoles.join(',')}`);
      navigate(landingPage, { replace: true });
      return;
    }

    // Check if user has permission to access this route
    if (!hasRoutePermission(availableRoles, currentPath)) {
      // Redirect to appropriate dashboard based on role
      const landingPage = getRoleLandingPage(availableRoles);

      if (currentPath !== landingPage) {
        console.log(`RouteGuard: No permission for ${currentPath}, redirecting to ${landingPage}`);
        navigate(landingPage, { replace: true });
      } else {
        console.warn(`RouteGuard: No permission for ${currentPath} and it is the landing page! Possible loop.`);
        // If we are stuck on a page we don't have permission for, and it's the landing page,
        // something is wrong with rolePermissions.ts or availableRoles.
        // Fallback to home if not already there
        if (currentPath !== '/dashboard') {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, availableRoles, authLoading, rolesLoading, currentPath, navigate, location]);

  // Show loading ONLY while initial auth/roles are loading
  if (authLoading || rolesLoading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  // For public routes, render immediately
  if (PUBLIC_ROUTES.includes(currentPath)) {
    return <>{children}</>;
  }

  // If not authenticated, render nothing (useEffect will redirect)
  if (!user) {
    return null;
  }

  // Explicit role gate
  if (requireRoles && !hasRequiredRole) {
    return null;
  }

  // If authenticated but no permission, render nothing (useEffect will redirect)
  if (!hasRoutePermission(availableRoles, currentPath)) {
    return null;
  }

  // If all checks pass, render the component immediately
  return <>{children}</>;
};

export default RouteGuard;
