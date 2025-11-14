import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/context/UserRolesContext';
import { getRoleLandingPage } from '@/utils/rolePermissions';
import { LoadingScreen } from '@/components/LoadingScreen';

interface RoleDashboardRedirectProps {
  fallbackPath?: string;
}

export const RoleDashboardRedirect = ({ fallbackPath = '/' }: RoleDashboardRedirectProps) => {
  const { availableRoles, loading } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Get the appropriate landing page based on user's roles
    const landingPage = getRoleLandingPage(availableRoles);
    
    // Redirect to the role-based landing page
    if (landingPage && landingPage !== fallbackPath) {
      navigate(landingPage, { replace: true });
    } else if (!availableRoles || availableRoles.length === 0) {
      // No roles assigned, redirect to fallback
      navigate(fallbackPath, { replace: true });
    }
  }, [availableRoles, loading, navigate, fallbackPath]);

  return <LoadingScreen message="Redirecting to your dashboard..." />;
};
