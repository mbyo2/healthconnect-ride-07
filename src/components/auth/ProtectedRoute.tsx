
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setIsAuthorized(isAuthenticated);
    }
  }, [isAuthenticated, isLoading]);

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
