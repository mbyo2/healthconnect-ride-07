
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
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
import InstitutionRegistration from "./pages/InstitutionRegistration";
import VideoConsultations from "./pages/VideoConsultations";
import ProviderProfile from "./pages/ProviderProfile";
import { BottomNav } from "./components/BottomNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProviderPortal } from "./pages/ProviderPortal";
import { InstitutionPortal } from "./pages/InstitutionPortal";
import { VoiceCommandsHelp } from '@/components/VoiceCommandsHelp';
import { SymptomCollector } from '@/components/SymptomCollector';
import { useAuth } from "./context/AuthContext";

// Auth redirect component
const AuthRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  return isAuthenticated ? <Navigate to="/symptoms" replace /> : <Navigate to="/auth" replace />;
};

function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const queryClient = new QueryClient();

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow pb-16 md:pb-0">
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<AuthRedirect />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/provider-portal" element={<ProviderPortal />} />
                  <Route path="/institution-portal" element={<InstitutionPortal />} />
                  
                  {/* Protected routes */}
                  <Route 
                    path="/symptoms" 
                    element={
                      <ProtectedRoute>
                        <SymptomCollector />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile-setup" 
                    element={
                      <ProtectedRoute>
                        <ProfileSetup />
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
                        <Map />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <ProtectedRoute>
                        <Chat />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/appointments" 
                    element={
                      <ProtectedRoute>
                        <Appointments />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/patient-appointments" 
                    element={
                      <ProtectedRoute>
                        <PatientAppointments />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/provider/:providerId" 
                    element={
                      <ProtectedRoute>
                        <ProviderProfile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/provider-dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['health_personnel', 'admin']}>
                        <ProviderDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/provider-calendar" 
                    element={
                      <ProtectedRoute allowedRoles={['health_personnel', 'admin']}>
                        <ProviderCalendar />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin-dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/healthcare-registration" 
                    element={
                      <ProtectedRoute>
                        <InstitutionRegistration />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/video-consultations" 
                    element={
                      <ProtectedRoute>
                        <VideoConsultations />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              {!isDesktop && <BottomNav />}
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
      <VoiceCommandsHelp />
    </>
  );
}

export default App;
