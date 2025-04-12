
import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { OfflineAlert } from './components/OfflineAlert';
import { useNetwork } from './hooks/use-network';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { TouchDetector } from './components/TouchDetector';
import { lazy, Suspense } from 'react';
import { MobileLayout } from './components/layouts/MobileLayout';
import { useDeviceType } from './hooks/use-device-type';
import { useIsMobile } from './hooks/use-mobile';
import { useEffect } from 'react';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoadingScreen } from './components/LoadingScreen';
import { MobileAppWrapper } from './components/MobileAppWrapper';

// Lazy load pages
const Landing = lazy(() => import('./pages/Landing'));
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const Login = lazy(() => import('./pages/Login'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Map = lazy(() => import('./pages/Map'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Chat = lazy(() => import('./pages/Chat'));
const VideoConsultations = lazy(() => import('./pages/VideoConsultations'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const Settings = lazy(() => import('./pages/SettingsPage'));
const PatientAppointments = lazy(() => import('./pages/PatientAppointments'));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const PrivacySecurityPage = lazy(() => import('./pages/PrivacySecurityPage'));

// Create a component to handle device-specific landing page
const LandingPageRouter = () => {
  const { deviceType } = useDeviceType();
  const isMobileOrTablet = deviceType === 'mobile' || deviceType === 'tablet';

  // Redirect to Auth for mobile/tablet, show Landing for desktop/TV
  return isMobileOrTablet ? <Navigate to="/auth" replace /> : <Landing />;
};

const App = () => {
  const { isOnline } = useNetwork();
  const { deviceType } = useDeviceType();
  const isMobile = useIsMobile();
  
  // Apply TV device class if on TV
  useEffect(() => {
    if (deviceType === 'tv') {
      document.body.classList.add('tv-device');
      // Load TV specific styles
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = '/tv-styles.css';
      document.head.appendChild(linkElement);
    } else {
      document.body.classList.remove('tv-device');
    }
    
    // Add touch-specific attributes for mobile
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      document.body.classList.add('touch-device');
      document.body.classList.add('prevent-overscroll');
    } else {
      document.body.classList.remove('touch-device');
      document.body.classList.remove('prevent-overscroll');
    }
    
    return () => {
      const tvStylesheet = document.querySelector('link[href="/tv-styles.css"]');
      if (tvStylesheet) {
        tvStylesheet.remove();
      }
    };
  }, [deviceType]);
  
  return (
    <>
      <MobileAppWrapper>
        <OfflineAlert />
        <PWAInstallPrompt />
        {process.env.NODE_ENV === 'development' && <TouchDetector />}
        
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<LandingPageRouter />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Index />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Search />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Profile />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Map />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route
              path="/appointments"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Appointments />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Chat />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/video-consultations"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <VideoConsultations />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/:id"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ProviderProfile />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <Settings />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/appointments/patient"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <PatientAppointments />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/dashboard"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <ProviderDashboard />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <AdminDashboard />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/dashboard"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <SuperAdminDashboard />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <MobileLayout>
                    <NotificationsPage />
                  </MobileLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/privacy-security"
              element={
                <MobileLayout>
                  <PrivacySecurityPage />
                </MobileLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </MobileAppWrapper>
    </>
  );
};

export default App;
