import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingScreen } from "@/components/LoadingScreen";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Map from "./pages/Map";
import Appointments from "./pages/Appointments";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Healthcare from "./pages/Healthcare";
import Chat from "./pages/Chat";
import VideoConsultations from "./pages/VideoConsultations";
import ProviderCalendar from "./pages/ProviderCalendar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  console.log("App component rendering");
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
          <BrowserRouter basename="/">
            <TooltipProvider>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Protected Setup Route */}
                <Route path="/profile-setup" element={
                  <ProtectedRoute>
                    <ProfileSetup />
                  </ProtectedRoute>
                } />

                {/* Default Redirect */}
                <Route path="/" element={<Navigate to="/home" replace />} />
                
                {/* Protected Routes with Role-Based Access */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <Routes>
                        {/* Common Routes */}
                        <Route path="home" element={<Index />} />
                        <Route path="search" element={<Search />} />
                        <Route path="map" element={<Map />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="chat" element={<Chat />} />
                        
                        {/* Patient Routes */}
                        <Route path="healthcare" element={<Healthcare />} />
                        <Route path="appointments" element={<Appointments />} />
                        <Route path="video-consultations" element={<VideoConsultations />} />
                        
                        {/* Admin Routes */}
                        <Route path="admin" element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } />
                        
                        {/* Provider Routes */}
                        <Route path="calendar" element={
                          <ProtectedRoute allowedRoles={['health_personnel']}>
                            <ProviderCalendar />
                          </ProtectedRoute>
                        } />
                        
                        {/* Fallback Route */}
                        <Route path="*" element={<Navigate to="/home" replace />} />
                      </Routes>
                    </MobileLayout>
                  </ProtectedRoute>
                } />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </NextThemesProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;