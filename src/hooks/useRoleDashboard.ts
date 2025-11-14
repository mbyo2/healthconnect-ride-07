import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { getRoleLandingPage } from '@/utils/rolePermissions';

/**
 * Hook that automatically redirects authenticated users to their role-based dashboard
 * Use this on public or landing pages to redirect logged-in users
 */
export const useRoleDashboard = (options?: {
  redirectOnAuth?: boolean;
  skip?: boolean;
}) => {
  const { user, loading: authLoading } = useAuth();
  const { availableRoles, loading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const { redirectOnAuth = true, skip = false } = options || {};

  useEffect(() => {
    // Skip if disabled or still loading
    if (skip || authLoading || rolesLoading) return;

    // Only redirect if user is authenticated and we should redirect
    if (user && redirectOnAuth && availableRoles && availableRoles.length > 0) {
      const landingPage = getRoleLandingPage(availableRoles);
      
      // Don't redirect if already on the correct landing page
      if (landingPage && location.pathname !== landingPage) {
        navigate(landingPage, { replace: true });
      }
    }
  }, [user, availableRoles, authLoading, rolesLoading, redirectOnAuth, skip, navigate, location.pathname]);

  return {
    isLoading: authLoading || rolesLoading,
    shouldRedirect: !!user && redirectOnAuth && !skip,
    targetDashboard: availableRoles ? getRoleLandingPage(availableRoles) : null
  };
};
