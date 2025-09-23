
import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useSession, useSupabaseClient, SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@supabase/supabase-js';
import { MobileLayout } from '@/components/MobileLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider } from '@/context/AuthContext';
// UserRolesProvider removed - not implemented
import { SearchProvider } from '@/context/SearchContext';
// FeedbackProvider removed - not implemented
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { SessionManager } from '@/components/auth/SessionManager';
import { ProfileSetup } from '@/components/auth/ProfileSetup';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/context/AuthContext';

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
const NotFound = lazy(() => import('@/pages/NotFound'));
const AdminWallet = lazy(() => import('@/pages/AdminWallet'));
const InstitutionWallet = lazy(() => import('@/pages/InstitutionWallet'));
const Wallet = lazy(() => import('@/pages/Wallet'));
const CreateAdmin = lazy(() => import('@/pages/CreateAdmin'));
const Auth = lazy(() => import('@/pages/Auth'));

// Advanced Healthcare Features - Lazy loaded components
const AdvancedDashboard = lazy(() => import('@/components/advanced-healthcare/AdvancedDashboard'));
const AIDiagnosticAssistant = lazy(() => import('@/components/phase5/AIDiagnosticAssistant'));
const BlockchainMedicalRecords = lazy(() => import('@/components/phase5/BlockchainMedicalRecords'));
const IoTHealthMonitoring = lazy(() => import('@/components/phase5/IoTHealthMonitoring'));
const EmergencyResponse = lazy(() => import('@/components/phase5/EmergencyResponse'));
const HealthDataVisualization = lazy(() => import('@/components/phase5/HealthDataVisualization'));
const ComplianceAudit = lazy(() => import('@/components/phase5/ComplianceAudit'));

// Remove duplicate supabase client - using the one from integrations

const AppContent = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const { userRole } = useAuth();

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
                    <Navigate to="/symptoms" replace={true} />
                  ) : (
                    <Auth />
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
                      <Navigate to="/symptoms" replace={true} />
                    )
                  ) : (
                    <Navigate to="/auth" replace={true} />
                  )
                }
              />

              {/* Protected Routes with Role-Based Access Control */}
              <Route path="/profile-setup" element={<RouteGuard><ProfileSetup /></RouteGuard>} />
              <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
              <Route path="/settings" element={<RouteGuard><Settings /></RouteGuard>} />
              <Route path="/search" element={<RouteGuard><SearchPage /></RouteGuard>} />
              <Route path="/appointments" element={<RouteGuard><Appointments /></RouteGuard>} />
              <Route path="/admin-dashboard" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
              <Route path="/provider-dashboard" element={<RouteGuard><ProviderDashboard /></RouteGuard>} />
              <Route path="/super-admin-dashboard" element={<RouteGuard><SuperAdminDashboard /></RouteGuard>} />
              <Route path="/pharmacy-inventory" element={<RouteGuard><PharmacyPortal /></RouteGuard>} />
              <Route path="/connections" element={<RouteGuard><Connections /></RouteGuard>} />
              <Route path="/chat" element={<RouteGuard><Chat /></RouteGuard>} />
              <Route path="/prescriptions" element={<RouteGuard><Prescriptions /></RouteGuard>} />
              <Route path="/symptoms" element={<RouteGuard><Symptoms /></RouteGuard>} />
              <Route path="/video-dashboard" element={<RouteGuard><VideoDashboard session={session} /></RouteGuard>} />
              <Route path="/testing" element={<RouteGuard><Testing /></RouteGuard>} />
              <Route path="/documentation" element={<RouteGuard><Documentation /></RouteGuard>} />
              <Route path="/marketplace-users" element={<RouteGuard><UserMarketplace /></RouteGuard>} />
              <Route path="/emergency" element={<RouteGuard><Emergency /></RouteGuard>} />
              <Route path="/marketplace" element={<RouteGuard><Marketplace /></RouteGuard>} />
              <Route path="/pharmacy-portal" element={<RouteGuard><PharmacyPortal /></RouteGuard>} />
              <Route path="/healthcare-application" element={<RouteGuard><HealthcareApplication /></RouteGuard>} />
              <Route path="/wallet" element={<RouteGuard><Wallet /></RouteGuard>} />
              <Route path="/admin-wallet" element={<RouteGuard><AdminWallet /></RouteGuard>} />
              <Route path="/institution-wallet" element={<RouteGuard><InstitutionWallet /></RouteGuard>} />
              <Route path="/create-admin" element={<RouteGuard><CreateAdmin /></RouteGuard>} />

              {/* Advanced Healthcare Features */}
              <Route path="/advanced-dashboard" element={<RouteGuard><AdvancedDashboard /></RouteGuard>} />
              <Route path="/ai-diagnostics" element={<RouteGuard><AIDiagnosticAssistant patientId={session?.user?.id || ''} /></RouteGuard>} />
              <Route path="/blockchain-records" element={<RouteGuard><BlockchainMedicalRecords patientId={session?.user?.id || ''} userRole={userRole === 'health_personnel' ? 'doctor' : (userRole as 'patient' | 'doctor' | 'nurse' | 'admin') || 'patient'} /></RouteGuard>} />
              <Route path="/iot-monitoring" element={<RouteGuard><IoTHealthMonitoring patientId={session?.user?.id || ''} /></RouteGuard>} />
              <Route path="/emergency-response" element={<RouteGuard><EmergencyResponse patientId={session?.user?.id || ''} /></RouteGuard>} />
              <Route path="/health-analytics" element={<RouteGuard><HealthDataVisualization patientId={session?.user?.id || ''} /></RouteGuard>} />
              <Route path="/compliance-audit" element={<RouteGuard><ComplianceAudit userRole={userRole === 'health_personnel' ? 'doctor' : (userRole as 'patient' | 'doctor' | 'nurse' | 'admin') || 'admin'} /></RouteGuard>} />
        
              {/* Payment Routes */}
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancel" element={<PaymentCancel />} />
              
              {/* Catch all route - 404 handler */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MobileLayout>
      </SessionManager>
    </SearchProvider>
  );
};

// Simplified App Content Component without problematic dependencies
const AppContentWithPreload: React.FC = React.memo(() => {
  return <AppContent />;
});

AppContentWithPreload.displayName = 'AppContentWithPreload';

// Main App Component with Authentication and Routing
const App: React.FC = () => {
  const supabaseClient = useMemo(() => 
    createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    ), []
  );

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      <AuthProvider>
        <AccessibilityProvider>
          <Router>
            <div className="App">
              <AppContentWithPreload />
            </div>
          </Router>
        </AccessibilityProvider>
      </AuthProvider>
    </SessionContextProvider>
  );
};

export default App;
