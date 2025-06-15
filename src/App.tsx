import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Account from '@/pages/Account';
import Home from '@/pages/Home';
import VideoDashboard from '@/pages/VideoDashboard';
import Appointments from '@/pages/Appointments';
import HealthcareProfessionals from '@/pages/HealthcareProfessionals';
import AdminDashboard from '@/pages/AdminDashboard';
import HealthcareInstitutions from '@/pages/HealthcareInstitutions';
import Prescriptions from '@/pages/Prescriptions';
import Symptoms from '@/pages/Symptoms';
import Connections from '@/pages/Connections';
import UserRolesProvider from '@/context/UserRolesContext';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { Chat } from '@/components/chat/Chat';
import UserMarketplace from "@/pages/UserMarketplace";

const App = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const session = useSession();
  const supabase = useSupabaseClient();

  useEffect(() => {
    const checkNewUser = async () => {
      if (session && session.user) {
        const { data, error } = await supabase
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
  }, [session, supabase]);

  return (
    <UserRolesProvider>
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
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google', 'github']}
                    redirectTo={`${window.location.origin}/`}
                  />
                </div>
              )
            }
          />
          <Route
            path="/account"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Account key={session.user.id} session={session} />
              )
            }
          />
          <Route
            path="/profile-setup"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <ProfileSetup session={session} />
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
            path="/appointments"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Appointments session={session} />
              )
            }
          />
           <Route
            path="/healthcare-professionals"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <HealthcareProfessionals session={session} />
              )
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <AdminDashboard session={session} />
              )
            }
          />
          <Route
            path="/healthcare-institutions"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <HealthcareInstitutions session={session} />
              )
            }
          />
          <Route
            path="/prescriptions"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Prescriptions session={session} />
              )
            }
          />
          <Route
            path="/symptoms"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Symptoms session={session} />
              )
            }
          />
          <Route
            path="/connections"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Connections session={session} />
              )
            }
          />
          <Route
            path="/chat/:connectionId"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Chat session={session} />
              )
            }
          />
          
          <Route path="/marketplace-users" element={<UserMarketplace />} />
          
        </Routes>
      </Router>
    </UserRolesProvider>
  );
};

export default App;
