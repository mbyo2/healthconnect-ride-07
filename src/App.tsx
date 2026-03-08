import React, { Suspense, lazy, useMemo } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { MobileLayout } from '@/components/MobileLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserRolesProvider } from '@/context/UserRolesContext';
import { SearchProvider } from '@/context/SearchContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAndroidBackButton } from '@/hooks/use-android-back-button';
import { usePageTracking } from '@/hooks/use-analytics';

// Retry wrapper for lazy imports to handle stale chunk errors
const lazyWithRetry = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() =>
      new Promise<any>((resolve) =>
        setTimeout(() => resolve(importFn()), 1500)
      )
    )
  );

// EAGERLY import the Landing page — it's the primary entry point for all visitors
import LandingPage from '@/pages/Landing';
const Landing = () => <LandingPage />;

// Lazy load all other page components with retry for chunk errors
const Home = lazyWithRetry(() => import('@/pages/Home'));
const Appointments = lazyWithRetry(() => import('@/pages/Appointments'));
const AdminDashboard = lazyWithRetry(() => import('@/pages/AdminDashboard'));
const Connections = lazyWithRetry(() => import('@/pages/Connections'));
const Chat = lazyWithRetry(() => import('@/pages/Chat'));
const Prescriptions = lazyWithRetry(() => import('@/pages/Prescriptions'));
const Symptoms = lazyWithRetry(() => import('@/pages/Symptoms'));
const HealthcareProfessionals = lazyWithRetry(() => import('@/pages/HealthcareProfessionals'));
const HealthcareInstitutions = lazyWithRetry(() => import('@/pages/HealthcareInstitutions'));
const VideoDashboard = lazyWithRetry(() => import('@/pages/VideoDashboard'));
const Profile = lazyWithRetry(() => import('@/pages/Profile'));
const Settings = lazyWithRetry(() => import('@/pages/Settings'));
const SearchPage = lazyWithRetry(() => import('@/pages/SearchPage'));
const Testing = lazyWithRetry(() => import('@/pages/Testing'));
const Documentation = lazyWithRetry(() => import('@/pages/Documentation'));
const UserMarketplace = lazyWithRetry(() => import('@/pages/UserMarketplace'));
const Emergency = lazyWithRetry(() => import('@/pages/Emergency'));
const PharmacyPortal = lazyWithRetry(() => import('@/pages/PharmacyPortal'));
const Marketplace = lazyWithRetry(() => import('@/pages/Marketplace'));
const ProviderDashboard = lazyWithRetry(() => import('@/pages/ProviderDashboard'));
const SuperAdminDashboard = lazyWithRetry(() => import('@/pages/SuperAdminDashboard'));
const HealthcareApplication = lazyWithRetry(() => import('@/pages/HealthcareApplication'));
const PharmacyInventory = lazyWithRetry(() => import('@/pages/PharmacyInventory'));
const Terms = lazyWithRetry(() => import('@/pages/Terms'));
const Privacy = lazyWithRetry(() => import('@/pages/Privacy'));
const Contact = lazyWithRetry(() => import('@/pages/Contact'));
const PaymentSuccess = lazyWithRetry(() => import('@/pages/PaymentSuccess'));
const PaymentCancel = lazyWithRetry(() => import('@/pages/PaymentCancel'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));
const CreateAdmin = lazyWithRetry(() => import('@/pages/CreateAdmin'));
const Auth = lazyWithRetry(() => import('@/pages/Auth'));
const AIDiagnostics = lazyWithRetry(() => import('@/pages/AIDiagnostics'));
const Register = lazyWithRetry(() => import('@/pages/Register'));
const ResetPassword = lazyWithRetry(() => import('@/pages/ResetPassword'));
const MedicalRecords = lazyWithRetry(() => import('@/pages/MedicalRecords'));
const VideoConsultations = lazyWithRetry(() => import('@/pages/VideoConsultations'));
const HealthDashboard = lazyWithRetry(() => import('@/pages/HealthDashboard'));
const Onboarding = lazyWithRetry(() => import('@/pages/Onboarding'));
const AdvancedDashboard = lazyWithRetry(() => import('@/pages/AdvancedDashboard'));
const BlockchainRecords = lazyWithRetry(() => import('@/pages/BlockchainRecords'));
const IoTMonitoring = lazyWithRetry(() => import('@/pages/IoTMonitoring'));
const HealthAnalytics = lazyWithRetry(() => import('@/pages/HealthAnalytics'));
const EmergencyResponse = lazyWithRetry(() => import('@/pages/EmergencyResponse'));
const PharmacyManagement = lazyWithRetry(() => import('@/pages/PharmacyManagement'));
const HospitalManagement = lazyWithRetry(() => import('@/pages/HospitalManagement'));
const LabManagement = lazyWithRetry(() => import('@/pages/LabManagement'));
const Map = lazyWithRetry(() => import('@/pages/Map'));
const NotificationsPage = lazyWithRetry(() => import('@/pages/NotificationsPage'));
const PrivacySecurityPage = lazyWithRetry(() => import('@/pages/PrivacySecurityPage'));
const Medications = lazyWithRetry(() => import('@/pages/Medications'));
const ProviderCalendar = lazyWithRetry(() => import('@/pages/ProviderCalendar'));
const ApplicationStatus = lazyWithRetry(() => import('@/pages/ApplicationStatus'));
const InstitutionPortal = lazyWithRetry(() => import('@/pages/InstitutionPortal'));
const InstitutionRegistration = lazyWithRetry(() => import('@/pages/InstitutionRegistration'));
const InstitutionStatus = lazyWithRetry(() => import('@/pages/InstitutionStatus'));
const InstitutionDashboard = lazyWithRetry(() => import('@/pages/InstitutionDashboard'));
const InstitutionPersonnel = lazyWithRetry(() => import('@/pages/InstitutionPersonnel'));
const InstitutionPatients = lazyWithRetry(() => import('@/pages/InstitutionPatients'));
const InstitutionReports = lazyWithRetry(() => import('@/pages/InstitutionReports'));
const InstitutionAppointments = lazyWithRetry(() => import('@/pages/InstitutionAppointments'));
const InstitutionSettings = lazyWithRetry(() => import('@/pages/InstitutionSettings'));
const InstitutionDevices = lazyWithRetry(() => import('@/pages/InstitutionDevices'));
const AppointmentDetails = lazyWithRetry(() => import('@/pages/AppointmentDetails'));
const Wallet = lazyWithRetry(() => import('@/pages/Wallet'));
const ProviderPortal = lazyWithRetry(() => import('@/pages/ProviderPortal'));
const ProviderProfile = lazyWithRetry(() => import('@/pages/ProviderProfile'));
const ProviderDetail = lazyWithRetry(() => import('@/pages/ProviderDetail'));
const VideoCall = lazyWithRetry(() => import('@/pages/VideoCall'));
const Providers = lazyWithRetry(() => import('@/pages/Providers'));
const RoleManagement = lazyWithRetry(() => import('@/pages/RoleManagement'));
const IntakeForm = lazyWithRetry(() => import('@/pages/IntakeForm'));
const BookingConfirmed = lazyWithRetry(() => import('@/pages/BookingConfirmed'));
const Pricing = lazyWithRetry(() => import('@/pages/Pricing'));

import { RoleRedirect } from '@/components/auth/RoleRedirect';

const AppContent = () => {
  const { user, isLoading, profile } = useAuth();

  // Initialize Android Hardware Back Button listener
  useAndroidBackButton();

  // Track page views for analytics
  usePageTracking();
  const isNewUser = useMemo(() => {
    // Check if user needs onboarding based on profile data
    // Use is_profile_complete flag for more reliable onboarding detection
    return profile?.is_profile_complete === false;
  }, [profile]);

  return (
    <SearchProvider>
      <MobileLayout>
        <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/landing" element={<Landing />} />
            <Route path="/healthcare-professionals" element={<HealthcareProfessionals />} />
            <Route path="/healthcare-institutions" element={<HealthcareInstitutions />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/register" element={<Register />} />
            {/* Public search & provider pages (ZocDoc-style) */}
            <Route path="/search" element={<SearchPage />} />
            <Route path="/providers" element={<Providers />} />
            <Route path="/marketplace-users" element={<UserMarketplace />} />
            <Route path="/provider/:id" element={<ProviderDetail />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/booking-confirmed" element={<RouteGuard><BookingConfirmed /></RouteGuard>} />
            <Route path="/reset-password" element={<Suspense fallback={<LoadingScreen />}><ResetPassword /></Suspense>} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route
              path="/auth"
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : user ? (
                  <Navigate to="/" replace={true} />
                ) : (
                  <Auth />
                )
              }
            />

            {/* Main App Route - role-based redirect */}
            <Route
              path="/"
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : user ? (
                  isNewUser ? (
                    <Navigate to="/onboarding" replace={true} />
                  ) : (
                    <RoleRedirect />
                  )
                ) : (
                  <Navigate to="/landing" replace={true} />
                )
              }
            />

            {/* Protected Routes with Role-Based Access Control */}
            <Route path="/onboarding" element={<RouteGuard><Onboarding /></RouteGuard>} />
            <Route path="/profile-setup" element={<Navigate to="/onboarding" replace />} />
            <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
            <Route path="/settings" element={<RouteGuard><Settings /></RouteGuard>} />
            {/* search is now public above */}
            <Route path="/appointments" element={<RouteGuard><Appointments /></RouteGuard>} />
            <Route path="/admin-dashboard" element={<RouteGuard><AdminDashboard /></RouteGuard>} />
            <Route path="/provider-dashboard" element={<RouteGuard><ProviderDashboard /></RouteGuard>} />
            <Route path="/super-admin-dashboard" element={<RouteGuard><SuperAdminDashboard /></RouteGuard>} />
            <Route path="/pharmacy-inventory" element={<RouteGuard><PharmacyInventory /></RouteGuard>} />
            <Route path="/connections" element={<RouteGuard><Connections /></RouteGuard>} />
            <Route path="/chat" element={<RouteGuard><Chat /></RouteGuard>} />
            <Route path="/prescriptions" element={<RouteGuard><Prescriptions /></RouteGuard>} />
            <Route path="/symptoms" element={<RouteGuard><Symptoms /></RouteGuard>} />
            <Route path="/video-dashboard" element={<RouteGuard><VideoDashboard /></RouteGuard>} />
            <Route path="/testing" element={<RouteGuard><Testing /></RouteGuard>} />
            <Route path="/documentation" element={<RouteGuard><Documentation /></RouteGuard>} />
            {/* marketplace-users and emergency are now public above */}
            <Route path="/map" element={<RouteGuard><Map /></RouteGuard>} />
            <Route path="/marketplace" element={<RouteGuard><Marketplace /></RouteGuard>} />
            <Route path="/pharmacy-portal" element={<RouteGuard><PharmacyPortal /></RouteGuard>} />
            <Route path="/healthcare-application" element={<RouteGuard><HealthcareApplication /></RouteGuard>} />
            <Route path="/create-admin" element={<RouteGuard><CreateAdmin /></RouteGuard>} />
            <Route path="/ai-diagnostics" element={<RouteGuard><AIDiagnostics /></RouteGuard>} />
            <Route path="/home" element={<RouteGuard><Home /></RouteGuard>} />
            <Route path="/medical-records" element={<RouteGuard><MedicalRecords /></RouteGuard>} />
            <Route path="/video-consultations" element={<RouteGuard><VideoConsultations /></RouteGuard>} />
            <Route path="/health-dashboard" element={<RouteGuard><HealthDashboard /></RouteGuard>} />
            <Route path="/wallet" element={<RouteGuard><Wallet /></RouteGuard>} />

            {/* Advanced Features */}
            <Route path="/advanced-dashboard" element={<RouteGuard><AdvancedDashboard /></RouteGuard>} />
            <Route path="/blockchain-records" element={<RouteGuard><BlockchainRecords /></RouteGuard>} />
            <Route path="/iot-monitoring" element={<RouteGuard><IoTMonitoring /></RouteGuard>} />
            <Route path="/health-analytics" element={<RouteGuard><HealthAnalytics /></RouteGuard>} />
            <Route path="/emergency-response" element={<RouteGuard><EmergencyResponse /></RouteGuard>} />

            {/* Management Systems */}
            <Route path="/pharmacy-management" element={<RouteGuard><PharmacyManagement /></RouteGuard>} />
            <Route path="/hospital-management" element={<RouteGuard><HospitalManagement /></RouteGuard>} />
            <Route path="/lab-management" element={<RouteGuard><LabManagement /></RouteGuard>} />

            {/* Additional User Pages */}
            <Route path="/notifications" element={<RouteGuard><NotificationsPage /></RouteGuard>} />
            <Route path="/privacy-security" element={<RouteGuard><PrivacySecurityPage /></RouteGuard>} />
            <Route path="/medications" element={<RouteGuard><Medications /></RouteGuard>} />
            <Route path="/provider-calendar" element={<RouteGuard><ProviderCalendar /></RouteGuard>} />

            {/* Institution & Application Management */}
            <Route path="/application-status" element={<RouteGuard><ApplicationStatus /></RouteGuard>} />
            <Route path="/institution-portal" element={<RouteGuard><InstitutionPortal /></RouteGuard>} />
            <Route path="/institution-registration" element={<RouteGuard><InstitutionRegistration /></RouteGuard>} />
            <Route path="/institution-status" element={<RouteGuard><InstitutionStatus /></RouteGuard>} />
            <Route path="/institution-dashboard" element={<RouteGuard><InstitutionDashboard /></RouteGuard>} />
            <Route path="/institution/personnel" element={<RouteGuard><InstitutionPersonnel /></RouteGuard>} />
            <Route path="/institution/patients" element={<RouteGuard><InstitutionPatients /></RouteGuard>} />
            <Route path="/institution/reports" element={<RouteGuard><InstitutionReports /></RouteGuard>} />
            <Route path="/institution/appointments" element={<RouteGuard><InstitutionAppointments /></RouteGuard>} />
            <Route path="/institution/settings" element={<RouteGuard><InstitutionSettings /></RouteGuard>} />
            <Route path="/institution/devices" element={<RouteGuard><InstitutionDevices /></RouteGuard>} />
            <Route path="/appointments/:id" element={<RouteGuard><AppointmentDetails /></RouteGuard>} />

            {/* Provider & Video */}
            <Route path="/provider-portal" element={<RouteGuard><ProviderPortal /></RouteGuard>} />
            <Route path="/provider-profile/:id" element={<RouteGuard><ProviderProfile /></RouteGuard>} />
            {/* provider/:id and providers are now public above */}
            <Route path="/video-call/:roomId" element={<RouteGuard><VideoCall /></RouteGuard>} />
            <Route path="/role-management" element={<RouteGuard><RoleManagement /></RouteGuard>} />
            <Route path="/intake-form" element={<RouteGuard><IntakeForm /></RouteGuard>} />

            {/* Payment Routes */}
            <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
            <Route path="/payment-cancel" element={<RouteGuard><PaymentCancel /></RouteGuard>} />

            {/* Catch all route - 404 handler */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </MobileLayout>
    </SearchProvider>
  );
};

// Route prefetch wrapper component
const RoutePrefetchWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useRoutePrefetch();
  useInitializePrefetch();
  return <>{children}</>;
};

// Simplified App Content Component without problematic dependencies
const AppContentWithPreload: React.FC = React.memo(() => {
  return (
    <RoutePrefetchWrapper>
      <AppContent />
    </RoutePrefetchWrapper>
  );
});

AppContentWithPreload.displayName = 'AppContentWithPreload';

// Main App Component with Authentication and Routing
const App: React.FC = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <UserRolesProvider>
          <AccessibilityProvider>
            <Router>
              <div className="App">
                <AppContentWithPreload />
              </div>
            </Router>
          </AccessibilityProvider>
        </UserRolesProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};

// import { createSpecificSuperUser } from './utils/createSpecificSuperUser';

// Expose superuser creation to window for console access
// if (typeof window !== 'undefined') {
//   (window as any).createSpecificSuperUser = createSpecificSuperUser;
// }

export default App;
