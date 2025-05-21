import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, Navigate, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { checkServiceWorkerStatus, registerServiceWorker } from "@/utils/service-worker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import { OfflineAlert } from "@/components/OfflineAlert";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { logAnalyticsEvent } from "@/utils/analytics-service";
import { MobileAppWrapper } from "@/components/MobileAppWrapper";
import { lazyLoadComponent } from "@/utils/code-splitting";
import { SearchProvider } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { NetworkErrorBoundary } from "@/components/errors/NetworkErrorBoundary";
import { performanceTracker } from "@/utils/performance-optimizations";
import { QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useDeviceType } from "@/hooks/use-device-type";

// Lazy-loaded components without dynamic imports
const Home = lazy(() => import("@/pages/Landing"));
const Auth = lazy(() => import("@/pages/Auth"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Profile = lazy(() => import("@/pages/Profile"));
const Appointments = lazy(() => import("@/pages/Appointments"));
const Search = lazy(() => import("@/pages/Search"));
const VideoCall = lazy(() => import("@/pages/VideoCall"));
const Messages = lazy(() => import("@/pages/Chat"));
const AppointmentDetails = lazy(() => import("@/pages/AppointmentDetails"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const Providers = lazy(() => import("@/pages/Providers"));
const PharmacyInventory = lazy(() => import("@/pages/PharmacyInventory"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const Medications = lazy(() => import("@/pages/Medications"));
const Testing = lazy(() => import("@/pages/Testing"));
const Documentation = lazy(() => import("@/pages/Documentation"));
const ProviderPortal = lazy(() => import("@/pages/ProviderPortal").then(module => ({ default: module.ProviderPortal })));
const ProviderDashboard = lazy(() => import("@/pages/ProviderDashboard"));
const InstitutionRegistration = lazy(() => import("@/pages/InstitutionRegistration"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));

// Preload critical routes for faster initial loading
if (typeof window !== 'undefined') {
  const routesToPreload = ['Auth', 'Login'];
  
  // Only preload most important routes
  Promise.all([
    import("@/pages/Auth"),
    import("@/pages/Login")
  ]).catch(console.error);
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, profile } = useAuth();
  const [startupTime, setStartupTime] = useState(performance.now());
  const { isMobile, isTablet } = useDeviceType();

  // Optimized initialization flow with performance tracking
  useEffect(() => {
    console.log("App initializing...");
    
    const initializeApp = async () => {
      const startTime = performance.now();
      
      try {
        // Register service worker
        await registerServiceWorker();

        // Check service worker status
        const swStatus = await checkServiceWorkerStatus();
        setServiceWorkerActive(swStatus);

        // Track app initialization performance
        const initTime = performance.now() - startTime;
        performanceTracker.trackMetric('app_initialization', initTime);
        
        // Log app initialization
        logAnalyticsEvent('app_initialized', {
          serviceWorkerActive: swStatus,
          initializationTime: initTime,
          timestamp: new Date().toISOString(),
        });

        // Minimal loading time for a faster experience
        const minLoadTime = 100; // Reduced to 100ms for faster startup
        
        // Only wait if we loaded faster than min time
        const elapsedTime = performance.now() - startTime;
        if (elapsedTime < minLoadTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadTime - elapsedTime));
        }
        
        setIsLoading(false);
        setStartupTime(performance.now() - startTime);
          
        // Log app load complete
        logAnalyticsEvent('app_loaded', {
          loadTime: performance.now() - startTime,
          url: window.location.pathname
        });
      } catch (error) {
        console.error("Error during app initialization:", error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);
  
  // Efficient page view tracking
  useEffect(() => {
    logAnalyticsEvent('page_view', {
      page: window.location.pathname,
      referrer: document.referrer
    });
    
    // Track page load performance
    performanceTracker.trackMetric('page_load_' + location.pathname.replace(/\//g, '_'), 
      performance.now() - startupTime);
      
  }, [location.pathname, startupTime]);

  // Force loading to end after timeout, ensuring the app always renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Forcing loading complete after timeout");
        setIsLoading(false);
      }
    }, 2000); // Reduced to 2 seconds max
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Intelligent route redirection based on user state
  useEffect(() => {
    if (!isLoading && isAuthenticated && location.pathname === '/login') {
      navigate('/');
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  return (
    <OnboardingProvider>
      <SearchProvider>
        <MobileAppWrapper>
          <ErrorBoundary>
            <NetworkErrorBoundary>
              <Routes>
                <Route
                  path="/*"
                  element={
                    <MobileLayout isLoading={isLoading}>
                      <Suspense fallback={<LoadingScreen message="Loading content..." />}>
                        <Routes>
                          {/* For mobile/tablet, redirect home to auth page */}
                          <Route path="/" element={
                            (isMobile || isTablet) 
                              ? <Navigate to="/auth" replace /> 
                              : <Home />
                          } />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/provider-portal" element={<ProviderPortal />} />
                          <Route path="/institution-registration" element={<InstitutionRegistration />} />
                          
                          {/* Legal pages */}
                          <Route path="/terms" element={<Terms />} />
                          <Route path="/privacy" element={<Privacy />} />
                          
                          {/* Protected routes */}
                          <Route path="/profile" element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          } />
                          <Route path="/appointments" element={
                            <ProtectedRoute>
                              <Appointments />
                            </ProtectedRoute>
                          } />
                          <Route path="/appointments/:id" element={
                            <ProtectedRoute>
                              <AppointmentDetails />
                            </ProtectedRoute>
                          } />
                          <Route path="/chat" element={
                            <ProtectedRoute>
                              <Messages />
                            </ProtectedRoute>
                          } />
                          
                          {/* Semi-protected routes */}
                          <Route path="/search" element={<Search />} />
                          <Route path="/video/:roomUrl" element={
                            <ProtectedRoute>
                              <VideoCall />
                            </ProtectedRoute>
                          } />
                          <Route path="/wallet" element={
                            <ProtectedRoute>
                              <Wallet />
                            </ProtectedRoute>
                          } />
                          <Route path="/providers" element={<Providers />} />
                          
                          {/* Role-specific routes */}
                          <Route path="/provider-dashboard" element={
                            <ProtectedRoute>
                              {profile?.role === 'health_personnel' ? 
                                <ProviderDashboard /> : 
                                <Navigate to="/" replace />}
                            </ProtectedRoute>
                          } />
                          <Route path="/pharmacy" element={
                            <ProtectedRoute>
                              {profile?.role === 'health_personnel' ? 
                                <PharmacyInventory /> : 
                                <Navigate to="/" replace />}
                            </ProtectedRoute>
                          } />
                          
                          {/* Other protected routes */}
                          <Route path="/medications" element={
                            <ProtectedRoute>
                              <Medications />
                            </ProtectedRoute>
                          } />
                          <Route path="/notifications" element={
                            <ProtectedRoute>
                              <NotificationsPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/settings" element={
                            <ProtectedRoute>
                              <SettingsPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/testing" element={
                            <ProtectedRoute>
                              <Testing />
                            </ProtectedRoute>
                          } />
                          <Route path="/documentation" element={<Documentation />} />
                          
                          {/* Handle 404 */}
                          <Route path="*" element={
                            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
                              <h1 className="text-3xl font-bold mb-4 text-blue-600">Page Not Found</h1>
                              <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or has been moved.</p>
                              <Button onClick={() => navigate('/')}>
                                Return Home
                              </Button>
                            </div>
                          } />
                        </Routes>
                      </Suspense>
                    </MobileLayout>
                  }
                />
              </Routes>
            </NetworkErrorBoundary>
          </ErrorBoundary>
          <Toaster />
          <OfflineAlert />
        </MobileAppWrapper>
      </SearchProvider>
    </OnboardingProvider>
  );
}

export default App;
