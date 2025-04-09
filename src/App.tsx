
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ProfileSetup from "./pages/ProfileSetup";
import Search from "./pages/Search";
import Map from "./pages/Map";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Appointments from "./pages/Appointments";
import PatientAppointments from "./pages/PatientAppointments";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderCalendar from "./pages/ProviderCalendar";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import InstitutionRegistration from "./pages/InstitutionRegistration";
import VideoConsultations from "./pages/VideoConsultations";
import ProviderProfile from "./pages/ProviderProfile";
import { ProviderPortal } from "./pages/ProviderPortal";
import { InstitutionPortal } from "./pages/InstitutionPortal";
import { VoiceCommandsHelp } from '@/components/VoiceCommandsHelp';
import { SymptomCollector } from '@/components/SymptomCollector';
import { useAuth } from "./context/AuthContext";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import PrivacySecurityPage from "./pages/PrivacySecurityPage";
import { OfflineAlert } from "./components/OfflineAlert";
import ApplicationStatus from "./pages/ApplicationStatus";
import HealthcareApplication from "./pages/HealthcareApplication";
import InstitutionStatus from "./pages/InstitutionStatus";
import { SearchProvider } from "./context/SearchContext";
import Index from "./pages/Index";
import PharmacyInventory from "./pages/PharmacyInventory";
import { Header } from "./components/Header";

// Auth redirect component
const AuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  return isAuthenticated ? <Navigate to="/symptoms" replace /> : <Navigate to="/auth" replace />;
};

function App() {
  const location = useLocation();
  // Only show header on public routes, ProtectedRoute component will handle its own header
  const showHeader = !['/landing', '/login', '/auth', '/provider-portal', '/institution-portal', '/reset-password'].includes(location.pathname) 
    && !location.pathname.startsWith('/symptoms')
    && !location.pathname.startsWith('/profile')
    && !location.pathname.startsWith('/search')
    && !location.pathname.startsWith('/map')
    && !location.pathname.startsWith('/chat')
    && !location.pathname.startsWith('/appointments')
    && !location.pathname.startsWith('/patient-appointments')
    && !location.pathname.startsWith('/provider')
    && !location.pathname.startsWith('/provider-dashboard')
    && !location.pathname.startsWith('/provider-calendar')
    && !location.pathname.startsWith('/admin-dashboard')
    && !location.pathname.startsWith('/superadmin-dashboard')
    && !location.pathname.startsWith('/healthcare-registration')
    && !location.pathname.startsWith('/video-consultations')
    && !location.pathname.startsWith('/notifications')
    && !location.pathname.startsWith('/settings')
    && !location.pathname.startsWith('/privacy-security')
    && !location.pathname.startsWith('/pharmacy-inventory')
    && !location.pathname.startsWith('/application-status')
    && !location.pathname.startsWith('/healthcare-application')
    && !location.pathname.startsWith('/institution-status');
  
  return (
    <AuthProvider>
      <SearchProvider>
        <div className="flex flex-col min-h-screen">
          {showHeader && <Header />}
          
          <main className="flex-1">
            <Routes>
              {/* Public routes - redirect to auth by default */}
              <Route path="/" element={<AuthRedirect />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/provider-portal" element={<ProviderPortal />} />
              <Route path="/institution-portal" element={<InstitutionPortal />} />
              
              {/* Protected routes - all with consistent layout */}
              <Route 
                path="/symptoms" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <SymptomCollector />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile-setup" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <ProfileSetup />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/application-status" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <ApplicationStatus />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/healthcare-application" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <HealthcareApplication />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/institution-status" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <InstitutionStatus />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/search" 
                element={
                  <ProtectedRoute>
                    <Search />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/map" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <Map />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chat" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <Chat />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <Profile />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/appointments" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <Appointments />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/patient-appointments" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <PatientAppointments />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/provider/:providerId" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <ProviderProfile />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/provider-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['health_personnel', 'admin']}>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <ProviderDashboard />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/provider-calendar" 
                element={
                  <ProtectedRoute allowedRoles={['health_personnel', 'admin']}>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <ProviderCalendar />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin-dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <AdminDashboard />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/superadmin-dashboard" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <SuperAdminDashboard />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/healthcare-registration" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <InstitutionRegistration />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/video-consultations" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <VideoConsultations />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <NotificationsPage />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <SettingsPage />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/privacy-security" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <PrivacySecurityPage />
                    </div>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pharmacy-inventory" 
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 md:px-6 py-6">
                      <PharmacyInventory />
                    </div>
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <OfflineAlert />
        </div>
        <VoiceCommandsHelp />
      </SearchProvider>
    </AuthProvider>
  );
}

export default App;
