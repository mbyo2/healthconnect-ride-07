
import * as React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OfflineAlert } from './components/OfflineAlert';
import { useNetwork } from './hooks/use-network';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { TouchDetector } from './components/TouchDetector';

// Import pages
import Landing from './pages/Landing';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Login from './pages/Login';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Map from './pages/Map';
import { ProtectedRoute } from './components/auth/ProtectedRoute'; // Fixed import to use named export
import ProfileSetup from './pages/ProfileSetup';
import Appointments from './pages/Appointments';
import Chat from './pages/Chat';
import VideoConsultations from './pages/VideoConsultations';
import ProviderProfile from './pages/ProviderProfile';
import Settings from './pages/SettingsPage';
import PatientAppointments from './pages/PatientAppointments';
import ProviderDashboard from './pages/ProviderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import NotificationsPage from './pages/NotificationsPage';
import PrivacySecurityPage from './pages/PrivacySecurityPage';
import { MobileLayout } from './components/layouts/MobileLayout';
import { useDeviceType } from './hooks/use-device-type';
import { useIsMobile } from './hooks/use-mobile';
import { useEffect } from 'react';

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
      <OfflineAlert />
      <PWAInstallPrompt />
      {process.env.NODE_ENV === 'development' && <TouchDetector />}
      
      <Routes>
        <Route path="/" element={<Landing />} />
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
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  );
};

export default App;
