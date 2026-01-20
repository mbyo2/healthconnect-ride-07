import { useEffect, useMemo } from 'react';
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

  const isLoading = authLoading || rolesLoading;
  
  // Calculate the target landing page
  const targetDashboard = useMemo(() => {
    if (!availableRoles || availableRoles.length === 0) return null;
    return getRoleLandingPage(availableRoles);
  }, [availableRoles]);

  // Determine if we need to redirect
  // Only true if: user exists, redirectOnAuth is enabled, not skipped, 
  // we have a target, AND we're not already there
  const needsRedirect = useMemo(() => {
    if (!user || !redirectOnAuth || skip || isLoading) return false;
    if (!targetDashboard) return false;
    // Already at the correct destination
    if (location.pathname === targetDashboard) return false;
    // Special case: if on /home and that's a valid page, don't redirect patients
    if (location.pathname === '/home' && targetDashboard === '/home') return false;
    return true;
  }, [user, redirectOnAuth, skip, isLoading, targetDashboard, location.pathname]);

  useEffect(() => {
    if (needsRedirect && targetDashboard) {
      console.log(`useRoleDashboard: Redirecting from ${location.pathname} to ${targetDashboard}`);
      navigate(targetDashboard, { replace: true });
    }
  }, [needsRedirect, targetDashboard, navigate, location.pathname]);

  return {
    isLoading,
    // Only show as "should redirect" if we actually need to redirect
    shouldRedirect: needsRedirect,
    targetDashboard
  };
};
