
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle Android hardware back button
 */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backButtonListener = App.addListener('backButton', (data) => {
      if (location.pathname === '/home' || location.pathname === '/auth' || location.pathname === '/landing') {
        // If on a root page, minimize the app
        App.exitApp();
      } else {
        // Otherwise, navigate back in the router
        navigate(-1);
      }
    });

    return () => {
      backButtonListener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);
};
