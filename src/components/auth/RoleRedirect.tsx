import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/context/UserRolesContext';
import { getRoleLandingPage } from '@/utils/rolePermissions';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Redirects authenticated users to their role-specific landing page.
 * Used on the "/" route so each role auto-navigates to the right dashboard.
 */
export const RoleRedirect = () => {
  const { availableRoles, loading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const target = getRoleLandingPage(availableRoles);
    navigate(target, { replace: true });
  }, [availableRoles, loading, navigate]);

  return <LoadingScreen message="Loading your dashboard..." />;
};
