
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
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
import Healthcare from "./pages/Healthcare";
import ProviderProfile from "./pages/ProviderProfile";
import { BottomNav } from "./components/BottomNav";
import { DesktopNav } from "./components/DesktopNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
      {isDesktop ? <DesktopNav /> : <BottomNav />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
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
        <Route path="/healthcare" element={<Healthcare />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
