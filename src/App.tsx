
import { lazy, Suspense, useEffect, useState, useCallback } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
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

// Lazy-loaded components using the utility
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
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);
  const location = useLocation();

  // Setup the initialization flow with better error handling
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

        // Instead of simulating delay, implement a minimum loading time
        // to prevent flashing of content
        const startTime = performance.now();
        const minLoadTime = 500; // 500ms minimum loading time
        
        const remainingTime = Math.max(0, minLoadTime - (performance.now() - startTime));
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        setIsLoading(false);
          
        // Log app load complete
        logAnalyticsEvent('app_loaded', {
          loadTime: performance.now(),
          url: window.location.pathname
        });
      } catch (error) {
        console.error("Error during app initialization:", error);
        setIsLoading(false);
      }
    };

    initializeApp();
    
    // Track page views - moved to a separate effect to prevent re-runs
  }, []);
  
  // Track page views
  useEffect(() => {
    const handlePageView = () => {
      logAnalyticsEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
      });
    };
    
    // Log initial page view
    handlePageView();
    
    // Setup listener for route changes
    return () => {
      // This cleanup function will run when the component unmounts
      // or when the dependencies change (location in this case)
    };
  }, [location.pathname]); // Only re-run when pathname changes

  // Force loading to end after timeout, ensuring the app always renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("Forcing loading complete after timeout");
        setIsLoading(false);
      }
    }, 5000); // 5 seconds max
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  return (
    <OnboardingProvider>
      <MobileAppWrapper>
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
      </MobileAppWrapper>
    </OnboardingProvider>
  );
}

export default App;
