
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@supabase/supabase-js';
import { MobileLayout } from '@/components/MobileLayout';
import Home from '@/pages/Home';
import Appointments from '@/pages/Appointments';
import AdminDashboard from '@/pages/AdminDashboard';
import Connections from '@/pages/Connections';
import Chat from '@/pages/Chat';
import Prescriptions from '@/pages/Prescriptions';
import Symptoms from '@/pages/Symptoms';
import HealthcareProfessionals from '@/pages/HealthcareProfessionals';
import HealthcareInstitutions from '@/pages/HealthcareInstitutions';
import VideoDashboard from '@/pages/VideoDashboard';
import Landing from '@/pages/Landing';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import SearchPage from '@/pages/SearchPage';
import Testing from '@/pages/Testing';
import Documentation from '@/pages/Documentation';
import { AuthProvider } from '@/context/AuthContext';
import { UserRolesProvider } from '@/context/UserRolesContext';
import { SearchProvider } from '@/context/SearchContext';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import UserMarketplace from "@/pages/UserMarketplace";
import Emergency from "@/pages/Emergency";
import PharmacyPortal from "@/pages/PharmacyPortal";
import Marketplace from "@/pages/Marketplace";

const supabase = createClient(
  "https://tthzcijscedgxjfnfnky.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHpjaWpzY2VkZ3hqZm5mbmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxMDU3ODgsImV4cCI6MjA0OTY4MTc4OH0.aum1F7Q4Eqrjf-eHkwyYBd9KDoZs2JaxN3l_vFDcWwY"
);

const AppContent = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const session = useSession();
  const supabaseClient = useSupabaseClient();

  useEffect(() => {
    const checkNewUser = async () => {
      if (session && session.user) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        }

        if (data && !data.first_name) {
          setIsNewUser(true);
        } else {
          setIsNewUser(false);
        }
      } else {
        setIsNewUser(false);
      }
    };

    checkNewUser();
  }, [session, supabaseClient]);

  return (
    <SearchProvider>
      <Router>
        <MobileLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
          <Route path="/healthcare-institutions" element={<HealthcareInstitutions />} />
          
          {/* Auth Route */}
          <Route
            path="/auth"
            element={
              session && session.user ? (
                <Navigate to="/" replace={true} />
              ) : (
                <div className="container" style={{ padding: '50px 0 100px 0' }}>
                  <Auth
                    supabaseClient={supabaseClient}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google', 'github']}
                    redirectTo={`${window.location.origin}/`}
                  />
                </div>
              )
            }
          />

          {/* Main App Route */}
          <Route
            path="/"
            element={
              session && session.user ? (
                isNewUser ? (
                  <Navigate to="/profile-setup" replace={true} />
                ) : (
                  <Home />
                )
              ) : (
                <div className="container" style={{ padding: '50px 0 100px 0' }}>
                  <Auth
                    supabaseClient={supabaseClient}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google', 'github']}
                    redirectTo={`${window.location.origin}/`}
                  />
                </div>
              )
            }
          />

          {/* Protected Routes */}
          <Route
            path="/profile-setup"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <ProfileSetup />
              )
            }
          />
          <Route
            path="/profile"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Profile />
              )
            }
          />
          <Route
            path="/settings"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Settings />
              )
            }
          />
          <Route
            path="/search"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <SearchPage />
              )
            }
          />
          <Route
            path="/appointments"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Appointments />
              )
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <AdminDashboard />
              )
            }
          />
          <Route
            path="/connections"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Connections />
              )
            }
          />
          <Route
            path="/chat"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Chat />
              )
            }
          />
          <Route
            path="/prescriptions"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Prescriptions />
              )
            }
          />
          <Route
            path="/symptoms"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Symptoms />
              )
            }
          />
          <Route
            path="/video-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <VideoDashboard session={session} />
              )
            }
          />
          <Route
            path="/testing"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Testing />
              )
            }
          />
          <Route
            path="/documentation"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Documentation />
              )
            }
          />
          <Route
            path="/marketplace-users"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <UserMarketplace />
              )
            }
          />
          <Route
            path="/emergency"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Emergency />
              )
            }
          />
          <Route
            path="/marketplace"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Marketplace />
              )
            }
          />
          <Route
            path="/pharmacy-portal"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <PharmacyPortal />
              )
            }
          />
        </Routes>
      </MobileLayout>
    </Router>
    </SearchProvider>
  );
};

const App = () => {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <UserRolesProvider>
          <AppContent />
        </UserRolesProvider>
      </AuthProvider>
    </SessionContextProvider>
  );
};

export default App;
