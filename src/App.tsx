
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { MobileLayout } from "@/components/MobileLayout";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { checkServiceWorkerStatus, registerServiceWorker } from "@/utils/service-worker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import { OfflineAlert } from "@/components/OfflineAlert";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { logAnalyticsEvent } from "@/utils/analytics-service";

// Lazy-loaded components
const Home = lazy(() => import("@/pages/Landing"));
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

// Preload critical routes
if (typeof window !== 'undefined') {
  import("@/pages/Landing");
  import("@/pages/Login");
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Register service worker
      await registerServiceWorker();

      // Check service worker status
      const swStatus = await checkServiceWorkerStatus();
      setServiceWorkerActive(swStatus);

      // Log app initialization
      logAnalyticsEvent('app_initialized', {
        serviceWorkerActive: swStatus,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });

      // Simulate loading delay
      setTimeout(() => {
        setIsLoading(false);
        
        // Log app load complete
        logAnalyticsEvent('app_loaded', {
          loadTime: performance.now(),
          url: window.location.pathname
        });
      }, 1500);
    };

    initializeApp();
    
    // Track page views
    const handleRouteChange = () => {
      logAnalyticsEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
      });
    };
    
    // Listen for history changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return (
    <AuthProvider>
      <OnboardingProvider>
        <Router>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <ErrorBoundary>
              <Routes>
                <Route
                  path="/*"
                  element={
                    <MobileLayout isLoading={isLoading}>
                      <Suspense fallback={<LoadingScreen />}>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/appointments" element={<Appointments />} />
                          <Route path="/appointments/:id" element={<AppointmentDetails />} />
                          <Route path="/search" element={<Search />} />
                          <Route path="/video/:roomUrl" element={<VideoCall />} />
                          <Route path="/chat" element={<Messages />} />
                          <Route path="/wallet" element={<Wallet />} />
                          <Route path="/providers" element={<Providers />} />
                          <Route path="/pharmacy" element={<PharmacyInventory />} />
                          <Route path="/medications" element={<Medications />} />
                          <Route path="/notifications" element={<NotificationsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/testing" element={<Testing />} />
                          <Route path="/documentation" element={<Documentation />} />
                        </Routes>
                      </Suspense>
                    </MobileLayout>
                  }
                />
              </Routes>
            </ErrorBoundary>
          )}
          <Toaster />
          <OfflineAlert />
        </Router>
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default App;
