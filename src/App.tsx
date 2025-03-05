import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./context/AuthContext";
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
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                <Route path="/search" element={<Search />} />
                <Route path="/map" element={<Map />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/patient-appointments" element={<PatientAppointments />} />
                <Route path="/provider/:providerId" element={<ProviderProfile />} />
                <Route path="/provider-dashboard" element={<ProviderDashboard />} />
                <Route path="/provider-calendar" element={<ProviderCalendar />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/healthcare-registration" element={<InstitutionRegistration />} />
                <Route path="/video-consultations" element={<VideoConsultations />} />
                <Route path="/provider-portal" element={<ProviderPortal />} />
                <Route path="/institution-portal" element={<InstitutionPortal />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            {!isDesktop && <BottomNav />}
          </div>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
    <VoiceCommandsHelp />
  );
}

export default App;
