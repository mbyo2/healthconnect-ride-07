import React, { useEffect } from 'react';
import { useRoutePreloader } from '@/hooks/usePerformance';

// Route imports for preloading
const routeImports = {
  symptoms: () => import('@/pages/Symptoms'),
  appointments: () => import('@/pages/Appointments'),
  chat: () => import('@/pages/Chat'),
  prescriptions: () => import('@/pages/Prescriptions'),
  profile: () => import('@/pages/Profile'),
  settings: () => import('@/pages/Settings'),
  wallet: () => import('@/pages/Wallet'),
  emergency: () => import('@/pages/Emergency'),
  aiDiagnostics: () => import('@/components/phase5/AIDiagnosticAssistant'),
  iotMonitoring: () => import('@/components/phase5/IoTHealthMonitoring'),
  healthAnalytics: () => import('@/components/phase5/HealthDataVisualization'),
};

interface PreloadManagerProps {
  currentRoute?: string;
  userRole?: string;
}

export const PreloadManager: React.FC<PreloadManagerProps> = ({ 
  currentRoute = '',
  userRole = 'patient'
}) => {
  const { preloadRoute } = useRoutePreloader();

  useEffect(() => {
    // Preload critical routes based on current route and user behavior patterns
    const preloadCriticalRoutes = async () => {
      const criticalRoutes = getCriticalRoutes(currentRoute, userRole);
      
      // Preload routes with a small delay to avoid blocking initial render
      setTimeout(() => {
        criticalRoutes.forEach((routeKey, index) => {
          setTimeout(() => {
            if (routeImports[routeKey as keyof typeof routeImports]) {
              preloadRoute(routeImports[routeKey as keyof typeof routeImports]);
            }
          }, index * 100); // Stagger preloading
        });
      }, 1000);
    };

    preloadCriticalRoutes();
  }, [currentRoute, userRole, preloadRoute]);

  return null; // This component doesn't render anything
};

// Determine critical routes to preload based on current context
const getCriticalRoutes = (currentRoute: string, userRole: string): string[] => {
  const baseRoutes = ['symptoms', 'appointments', 'profile'];
  
  // Route-specific preloading
  const routeSpecificPreloads: Record<string, string[]> = {
    '/symptoms': ['appointments', 'chat', 'aiDiagnostics'],
    '/appointments': ['chat', 'prescriptions', 'wallet'],
    '/chat': ['prescriptions', 'appointments'],
    '/profile': ['settings', 'wallet'],
    '/': ['symptoms', 'appointments'],
    '/auth': ['symptoms', 'profile'],
  };

  // Role-specific preloading
  const roleSpecificPreloads: Record<string, string[]> = {
    'patient': ['symptoms', 'appointments', 'chat', 'prescriptions'],
    'health_personnel': ['appointments', 'chat', 'prescriptions'],
    'admin': ['appointments', 'settings', 'wallet'],
  };

  const routePreloads = routeSpecificPreloads[currentRoute] || baseRoutes;
  const rolePreloads = roleSpecificPreloads[userRole] || baseRoutes;

  // Combine and deduplicate
  return [...new Set([...routePreloads, ...rolePreloads])];
};

PreloadManager.displayName = 'PreloadManager';
