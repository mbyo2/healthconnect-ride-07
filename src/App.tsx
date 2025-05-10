
import { useState, useEffect, lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { MobileLayout } from "@/components/MobileLayout";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { checkServiceWorkerStatus, registerServiceWorker } from "@/utils/service-worker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import { OfflineAlert } from "@/components/OfflineAlert";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { logAnalyticsEvent } from "@/utils/analytics-service";
import { lazyLoadComponent } from "@/utils/code-splitting";

// Lazy-loaded components using the new utility
const Home = lazyLoadComponent(() => import("@/pages/Landing"));
const Login = lazyLoadComponent(() => import("@/pages/Login"));
const Register = lazyLoadComponent(() => import("@/pages/Register"));
const Profile = lazyLoadComponent(() => import("@/pages/Profile"));
const Appointments = lazyLoadComponent(() => import("@/pages/Appointments"));
const Search = lazyLoadComponent(() => import("@/pages/Search"));
const VideoCall = lazyLoadComponent(() => import("@/pages/VideoCall"));
const Messages = lazyLoadComponent(() => import("@/pages/Chat"));
const AppointmentDetails = lazyLoadComponent(() => import("@/pages/AppointmentDetails"));
const Wallet = lazyLoadComponent(() => import("@/pages/Wallet"));
const Providers = lazyLoadComponent(() => import("@/pages/Providers"));
const PharmacyInventory = lazyLoadComponent(() => import("@/pages/PharmacyInventory"));
const NotificationsPage = lazyLoadComponent(() => import("@/pages/NotificationsPage"));
const SettingsPage = lazyLoadComponent(() => import("@/pages/SettingsPage"));
const Medications = lazyLoadComponent(() => import("@/pages/Medications"));
const Testing = lazyLoadComponent(() => import("@/pages/Testing"));
const Documentation = lazyLoadComponent(() => import("@/pages/Documentation"));

// Preload critical routes for faster initial loading
if (typeof window !== 'undefined') {
  import("@/pages/Landing");
  import("@/pages/Login");
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const location = useLocation();

  // Track render count to help debug infinite loop issues
  const [renderCount, setRenderCount] = useState(0);
  
  useEffect(() => {
    // Simple render counter to track potential render loops
    setRenderCount(prev => {
      const newCount = prev + 1;
      if (newCount > 20 && isInitializing) {
        console.warn("Possible render loop detected. Forcing initialization complete.");
        setIsInitializing(false);
      }
      return newCount;
    });
  });

  useEffect(() => {
    console.log("App initializing...");
    
    const initializeApp = async () => {
      try {
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

        // Simulate loading delay - but not too long!
        setTimeout(() => {
          setIsLoading(false);
          setIsInitializing(false);
          
          // Log app load complete
          logAnalyticsEvent('app_loaded', {
            loadTime: performance.now(),
            url: window.location.pathname
          });
        }, 1000);
      } catch (error) {
        console.error("Error during app initialization:", error);
        // Even if there's an error, we should stop showing the loading screen
        setIsLoading(false);
        setIsInitializing(false);
      }
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

  // Force render after 10 seconds even if initialization is still ongoing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isInitializing) {
        console.warn("Forcing initialization complete after timeout");
        setIsInitializing(false);
        setIsLoading(false);
      }
    }, 10000); // 10 seconds max
    
    return () => clearTimeout(timeoutId);
  }, [isInitializing]);

  // Show simple loading screen during initialization
  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <OnboardingProvider>
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
      <Toaster />
      <OfflineAlert />
    </OnboardingProvider>
  );
}

export default App;
