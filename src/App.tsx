
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@supabase/supabase-js';
import { MobileLayout } from '@/components/MobileLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider } from '@/context/AuthContext';
import { UserRolesProvider } from '@/context/UserRolesContext';
import { SearchProvider } from '@/context/SearchContext';
import { SessionManager } from '@/components/auth/SessionManager';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';

// Lazy load all page components for better performance
const Home = lazy(() => import('@/pages/Home'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Connections = lazy(() => import('@/pages/Connections'));
const Chat = lazy(() => import('@/pages/Chat'));
const Prescriptions = lazy(() => import('@/pages/Prescriptions'));
const Symptoms = lazy(() => import('@/pages/Symptoms'));
const HealthcareProfessionals = lazy(() => import('@/pages/HealthcareProfessionals'));
const HealthcareInstitutions = lazy(() => import('@/pages/HealthcareInstitutions'));
const VideoDashboard = lazy(() => import('@/pages/VideoDashboard'));
const Landing = lazy(() => import('@/pages/Landing'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const Testing = lazy(() => import('@/pages/Testing'));
const Documentation = lazy(() => import('@/pages/Documentation'));
const UserMarketplace = lazy(() => import('@/pages/UserMarketplace'));
const Emergency = lazy(() => import('@/pages/Emergency'));
const PharmacyPortal = lazy(() => import('@/pages/PharmacyPortal'));
const Marketplace = lazy(() => import('@/pages/Marketplace'));
const ProviderDashboard = lazy(() => import('@/pages/ProviderDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const HealthcareApplication = lazy(() => import('@/pages/HealthcareApplication'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Contact = lazy(() => import('@/pages/Contact'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/pages/PaymentCancel'));
const AdminWallet = lazy(() => import('@/pages/AdminWallet'));
const InstitutionWallet = lazy(() => import('@/pages/InstitutionWallet'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const CreateAdmin = lazy(() => import('@/pages/CreateAdmin'));

// Phase 5 Advanced Features - Lazy loaded components
const Phase5Dashboard = lazy(() => import('@/components/phase5/Phase5Dashboard'));
const AIDiagnosticAssistant = lazy(() => import('@/components/phase5/AIDiagnosticAssistant'));
const BlockchainMedicalRecords = lazy(() => import('@/components/phase5/BlockchainMedicalRecords'));
const IoTHealthMonitoring = lazy(() => import('@/components/phase5/IoTHealthMonitoring'));
const EmergencyResponse = lazy(() => import('@/components/phase5/EmergencyResponse'));
const HealthDataVisualization = lazy(() => import('@/components/phase5/HealthDataVisualization'));
const ComplianceAudit = lazy(() => import('@/components/phase5/ComplianceAudit'));

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
        <SessionManager>
        <MobileLayout>
        <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
          <Route path="/healthcare-institutions" element={<HealthcareInstitutions />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          
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
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </RoleProtectedRoute>
              )
            }
          />
          <Route
            path="/provider-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['health_personnel']}>
                  <ProviderDashboard />
                </RoleProtectedRoute>
              )
            }
          />
          <Route
            path="/super-admin-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <SuperAdminDashboard />
                </RoleProtectedRoute>
              )
            }
          />
          <Route
            path="/pharmacy-inventory"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['health_personnel']}>
                  <PharmacyPortal />
                </RoleProtectedRoute>
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
                <RoleProtectedRoute allowedRoles={['health_personnel']}>
                  <PharmacyPortal />
                </RoleProtectedRoute>
              )
            }
          />
          <Route
            path="/healthcare-application"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <HealthcareApplication />
              )
            }
          />
          <Route
            path="/wallet"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Wallet />
              )
            }
          />
          <Route
            path="/admin-wallet"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <AdminWallet />
                </RoleProtectedRoute>
              )
            }
          />
          <Route
            path="/institution-wallet"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <InstitutionWallet />
              )
            }
          />
          <Route
            path="/create-admin"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['admin']}>
                  <CreateAdmin />
                </RoleProtectedRoute>
              )
            }
          />

          {/* Phase 5 Advanced Healthcare Features */}
          <Route
            path="/phase5-dashboard"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <Phase5Dashboard />
              )
            }
          />
          <Route
            path="/ai-diagnostics"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <AIDiagnosticAssistant />
              )
            }
          />
          <Route
            path="/blockchain-records"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <BlockchainMedicalRecords />
              )
            }
          />
          <Route
            path="/iot-monitoring"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <IoTHealthMonitoring />
              )
            }
          />
          <Route
            path="/emergency-response"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <EmergencyResponse />
              )
            }
          />
          <Route
            path="/health-visualization"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <HealthDataVisualization />
              )
            }
          />
          <Route
            path="/compliance-audit"
            element={
              !session ? (
                <Navigate to="/" replace={true} />
              ) : (
                <RoleProtectedRoute allowedRoles={['admin', 'health_personnel']}>
                  <ComplianceAudit />
                </RoleProtectedRoute>
              )
            }
          />
          
          {/* Payment Routes */}
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          
          {/* Catch-all route for 404 */}
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1><p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p><button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">Go Home</button></div></div>} />
        </Routes>
        </Suspense>
        </MobileLayout>
        </SessionManager>
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
