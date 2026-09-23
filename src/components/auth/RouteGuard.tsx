import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { hasRoutePermission, getRoleLandingPage, PUBLIC_ROUTES } from '@/utils/rolePermissions';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * Circuit breaker against redirect ping-pong (e.g. landing page == current
 * page with no permission, auth state flapping). If the same redirect
 * target fires repeatedly within a short window, stop navigating and show
 * recovery UI instead of bouncing the user forever.
 */
const LOOP_KEY = 'doc_route_redirect_log';
const LOOP_WINDOW_MS = 10_000;
const LOOP_MAX = 3;

function recordRedirect(target: string): boolean {
  try {
    const now = Date.now();
    const log: { target: string; at: number }[] = JSON.parse(
      sessionStorage.getItem(LOOP_KEY) || '[]'
    ).filter((e: { at: number }) => now - e.at < LOOP_WINDOW_MS);
    log.push({ target, at: now });
    sessionStorage.setItem(LOOP_KEY, JSON.stringify(log));
    return log.filter((e) => e.target === target).length > LOOP_MAX;
  } catch {
    return false;
  }
}

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
  const { user, loading: authLoading, signOut } = useAuth();
  const { availableRoles, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [loopStuck, setLoopStuck] = useState(false);

  const hasRequiredRole = !requireRoles || requireRoles.some(r => availableRoles.includes(r as any));

  useEffect(() => {
    // Only run checks after loading is complete
    if (authLoading || rolesLoading || loopStuck) return;

    // Allow access to public routes
    if (PUBLIC_ROUTES.includes(currentPath)) {
      return;
    }

    const guardedNavigate = (target: string, reason: string) => {
      if (target === currentPath) return; // never bounce to self
      if (recordRedirect(target)) {
        console.error(`RouteGuard: redirect loop detected → ${target}. Stopping.`);
        setLoopStuck(true);
        return;
      }
      console.log(`RouteGuard: ${reason}, redirecting to ${target}`);
      navigate(target, { replace: true, state: { from: location } });
    };

    // Redirect to auth if not authenticated — carry the return-to path so
    // login drops the user back where they were (Spotify/Google pattern).
    if (!user) {
      if (currentPath !== '/auth') {
        const returnTo = `${location.pathname}${location.search}`;
        guardedNavigate(
          `/auth?redirect=${encodeURIComponent(returnTo)}`,
          `Not authenticated (from ${currentPath})`
        );
      }
      return;
    }

    // Explicit role allowlist takes priority
    if (requireRoles && !hasRequiredRole) {
      const landingPage = getRoleLandingPage(availableRoles);
      console.warn(`RouteGuard: role-restricted route ${currentPath} blocked. Required: ${requireRoles.join(',')}`);
      guardedNavigate(landingPage, 'role-restricted route blocked');
      return;
    }

    // Check if user has permission to access this route
    if (!hasRoutePermission(availableRoles, currentPath)) {
      // Redirect to appropriate dashboard based on role
      const landingPage = getRoleLandingPage(availableRoles);

      if (currentPath !== landingPage) {
        guardedNavigate(landingPage, `No permission for ${currentPath}`);
      } else {
        console.warn(`RouteGuard: No permission for ${currentPath} and it is the landing page! Possible loop.`);
        // If we are stuck on a page we don't have permission for, and it's the landing page,
        // something is wrong with rolePermissions.ts or availableRoles.
        // Fallback to home if not already there
        if (currentPath !== '/dashboard') {
          guardedNavigate('/dashboard', 'landing page without permission');
        }
      }
    }
  }, [user, availableRoles, authLoading, rolesLoading, currentPath, navigate, location, requireRoles, hasRequiredRole, loopStuck]);

  if (loopStuck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Navigation got stuck</h2>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">
          The app kept redirecting between pages. This usually clears by
          returning to your dashboard or signing in again.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            onClick={() => {
              try { sessionStorage.removeItem(LOOP_KEY); } catch { /* ignore */ }
              setLoopStuck(false);
              navigate('/dashboard', { replace: true });
            }}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try { sessionStorage.removeItem(LOOP_KEY); } catch { /* ignore */ }
              await signOut();
              navigate('/auth', { replace: true });
            }}
          >
            Sign Out & Sign In
          </Button>
        </div>
      </div>
    );
  }

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
