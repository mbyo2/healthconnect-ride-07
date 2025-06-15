
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@supabase/supabase-js';
import Home from '@/pages/Home';
import Appointments from '@/pages/Appointments';
import AdminDashboard from '@/pages/AdminDashboard';
import Connections from '@/pages/Connections';
import { UserRolesProvider } from '@/context/UserRolesContext';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import UserMarketplace from "@/pages/UserMarketplace";

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
    <Router>
      <Routes>
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
        <Route path="/marketplace-users" element={<UserMarketplace />} />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <UserRolesProvider>
        <AppContent />
      </UserRolesProvider>
    </SessionContextProvider>
  );
};

export default App;
