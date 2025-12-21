
import React, { useEffect, useState, Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { MobileLayout } from '@/components/MobileLayout';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserRolesProvider } from '@/context/UserRolesContext';
import { SearchProvider } from '@/context/SearchContext';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useRoutePrefetch, useInitializePrefetch } from '@/hooks/use-route-prefetch';

// Lazy load all page components for better performance
const Home = lazy(() => import('@/pages/Home'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Connections = lazy(() => import('@/pages/Connections'));
const Chat = lazy(() => import('@/pages/Chat'));
const Prescriptions = lazy(() => import('@/pages/Prescriptions'));
import Symptoms from '@/pages/Symptoms'; // Direct import to fix lazy loading issue
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
const PharmacyInventory = lazy(() => import('@/pages/PharmacyInventory'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Contact = lazy(() => import('@/pages/Contact'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/pages/PaymentCancel'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const CreateAdmin = lazy(() => import('@/pages/CreateAdmin'));
const Auth = lazy(() => import('@/pages/Auth'));
const AIDiagnostics = lazy(() => import('@/pages/AIDiagnostics'));
const Register = lazy(() => import('@/pages/Register'));
const MedicalRecords = lazy(() => import('@/pages/MedicalRecords'));
const VideoConsultations = lazy(() => import('@/pages/VideoConsultations'));
const HealthDashboard = lazy(() => import('@/pages/HealthDashboard'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const AdvancedDashboard = lazy(() => import('@/pages/AdvancedDashboard'));
const BlockchainRecords = lazy(() => import('@/pages/BlockchainRecords'));
const IoTMonitoring = lazy(() => import('@/pages/IoTMonitoring'));
const HealthAnalytics = lazy(() => import('@/pages/HealthAnalytics'));
const EmergencyResponse = lazy(() => import('@/pages/EmergencyResponse'));
const PharmacyManagement = lazy(() => import('@/pages/PharmacyManagement'));
const HospitalManagement = lazy(() => import('@/pages/HospitalManagement'));
const LabManagement = lazy(() => import('@/pages/LabManagement'));
const Map = lazy(() => import('@/pages/Map'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PrivacySecurityPage = lazy(() => import('@/pages/PrivacySecurityPage'));
const Medications = lazy(() => import('@/pages/Medications'));
const ProviderCalendar = lazy(() => import('@/pages/ProviderCalendar'));
const ApplicationStatus = lazy(() => import('@/pages/ApplicationStatus'));
const InstitutionPortal = lazy(() => import('@/pages/InstitutionPortal'));
const InstitutionRegistration = lazy(() => import('@/pages/InstitutionRegistration'));
const InstitutionStatus = lazy(() => import('@/pages/InstitutionStatus'));
const InstitutionDashboard = lazy(() => import('@/pages/InstitutionDashboard'));
const InstitutionPersonnel = lazy(() => import('@/pages/InstitutionPersonnel'));
const InstitutionPatients = lazy(() => import('@/pages/InstitutionPatients'));
const InstitutionReports = lazy(() => import('@/pages/InstitutionReports'));
const InstitutionAppointments = lazy(() => import('@/pages/InstitutionAppointments'));
const InstitutionSettings = lazy(() => import('@/pages/InstitutionSettings'));
const AppointmentDetails = lazy(() => import('@/pages/AppointmentDetails'));

const AppContent = () => {
  const { user, session, isLoading, profile } = useAuth();

  const isNewUser = useMemo(() => {
    // Check if user needs onboarding based on profile data
    return !!(profile && !profile.first_name);
  }, [profile]);

  return (
    <SearchProvider>
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
            <Route path="/register" element={<Register />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route
              path="/auth"
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : user ? (
                  <Navigate to="/home" replace={true} />
                ) : (
                  <Auth />
                )
              }
            />

            {/* Main App Route */}
            <Route
              path="/"
              element={
                isLoading ? (
                  <LoadingScreen />
                ) : user ? (
                  isNewUser ? (
                    <Navigate to="/onboarding" replace={true} />
                  ) : (
                    <Navigate to="/home" replace={true} />
                  )
                ) : (
                  <Navigate to="/auth" replace={true} />
                )
              }
            />

            {/* Protected Routes with Role-Based Access Control */}
            <Route path="/onboarding" element={<RouteGuard><Onboarding /></RouteGuard>} />
            <Route path="/profile-setup" element={<Navigate to="/onboarding" replace />} />
            <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
            <Route path="/settings" element={<RouteGuard><Settings /></RouteGuard>} />
            <Route path="/search" element={<RouteGuard><SearchPage /></RouteGuard>} />
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
            <Route path="/marketplace-users" element={<RouteGuard><UserMarketplace /></RouteGuard>} />
            <Route path="/emergency" element={<RouteGuard><Emergency /></RouteGuard>} />
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
            <Route path="/healthcare-professionals" element={<RouteGuard><HealthcareProfessionals /></RouteGuard>} />
            <Route path="/healthcare-institutions" element={<RouteGuard><HealthcareInstitutions /></RouteGuard>} />

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
            <Route path="/appointments/:id" element={<RouteGuard><AppointmentDetails /></RouteGuard>} />

            {/* Payment Routes */}
            <Route path="/payment-success" element={<RouteGuard><PaymentSuccess /></RouteGuard>} />
            <Route path="/payment-cancel" element={<RouteGuard><PaymentCancel /></RouteGuard>} />

            {/* Catch all route - 404 handler */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
  );
};

import { createSpecificSuperUser } from './utils/createSpecificSuperUser';

// Expose superuser creation to window for console access
if (typeof window !== 'undefined') {
  (window as any).createSpecificSuperUser = createSpecificSuperUser;
}

export default App;
