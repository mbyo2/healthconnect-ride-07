
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setIsAuthorized(false);
      } else if (requireAdmin && profile?.role !== 'admin') {
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [isAuthenticated, isLoading, profile, requireAdmin]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthorized === false) {
    // Redirect to login with return path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthorized === true) {
    return <>{children}</>;
  }

  // Still determining authorization
  return <LoadingScreen />;
};
