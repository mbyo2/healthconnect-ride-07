import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Map from "./pages/Map";
import Appointments from "./pages/Appointments";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import Healthcare from "./pages/Healthcare";
import Chat from "./pages/Chat";
import VideoConsultations from "./pages/VideoConsultations";
import ProviderCalendar from "./pages/ProviderCalendar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    console.log("Checking authentication status...");
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session check error:", error);
          toast.error("Authentication error. Please try logging in again.");
          setIsAuthenticated(false);
          return;
        }
        console.log("Session status:", !!session);
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Unexpected error during session check:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", { event, session });
      setIsTransitioning(true);
      
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        toast.info("You have been signed out");
      } else if (event === "SIGNED_IN") {
        setIsAuthenticated(true);
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Session token refreshed");
      }
      
      setIsLoading(false);
      setTimeout(() => setIsTransitioning(false), 500); // Small delay for smooth transition
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading || isTransitioning) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  console.log("App component rendering");
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
          <BrowserRouter basename="/">
            <TooltipProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <Routes>
                          <Route path="home" element={<Index />} />
                          <Route path="healthcare" element={<Healthcare />} />
                          <Route path="search" element={<Search />} />
                          <Route path="map" element={<Map />} />
                          <Route path="appointments" element={<Appointments />} />
                          <Route path="chat" element={<Chat />} />
                          <Route path="video-consultations" element={<VideoConsultations />} />
                          <Route path="profile" element={<Profile />} />
                          <Route path="admin" element={<AdminDashboard />} />
                          <Route path="calendar" element={<ProviderCalendar />} />
                          <Route path="*" element={<Navigate to="/home" replace />} />
                        </Routes>
                      </MobileLayout>
                    </ProtectedRoute>
                  }
                />
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