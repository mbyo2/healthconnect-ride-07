
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook to handle Android hardware back button. Native-only: on web there is
 * no hardware back button and the listener would only add noise.
 */
export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let remove: (() => void) | undefined;
    App.addListener('backButton', () => {
      if (location.pathname === '/home' || location.pathname === '/auth' || location.pathname === '/landing') {
        // If on a root page, minimize the app
        App.exitApp();
      } else {
        // Otherwise, navigate back in the router
        navigate(-1);
      }
    }).then((l) => { remove = () => l.remove(); });

    return () => { remove?.(); };
  }, [location.pathname, navigate]);
};
