import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layouts/MobileLayout";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Map from "./pages/Map";
import Appointments from "./pages/Appointments";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <MobileLayout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/map" element={<Map />} />
                    <Route path="/appointments" element={<Appointments />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Routes>
                </MobileLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <Sonner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;