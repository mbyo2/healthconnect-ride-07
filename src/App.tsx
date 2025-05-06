import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';
import Login from '@/pages/Login';
import CreateAdmin from '@/pages/CreateAdmin';
import AdminWallet from '@/pages/AdminWallet';
import NotFound from '@/pages/NotFound';
import { RouteErrorBoundary } from '@/components/ui/route-error-boundary';

// Create ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode; 
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  providerOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false, providerOnly = false }: ProtectedRouteProps) => {
  const { isAuthenticated, user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && (!profile?.admin_level)) {
    return <Navigate to="/" replace />;
  }
  
  if (superAdminOnly && profile?.admin_level !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  
  if (providerOnly && profile?.role !== 'health_personnel') {
    return <Navigate to="/" replace />;
  }
  
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
};

// Lazy-loaded components
const Home = lazy(() => import('@/pages/Index'));
const ProfileSetup = lazy(() => import('@/pages/ProfileSetup'));
const ProviderPortal = lazy(() => import('@/pages/ProviderPortal').then(module => ({ default: module.ProviderPortal })));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const ProviderDashboard = lazy(() => import('@/pages/ProviderDashboard'));
const ApplicationStatus = lazy(() => import('@/pages/ApplicationStatus'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const VideoConsultation = lazy(() => import('@/pages/VideoConsultations'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Auth = lazy(() => import('@/pages/Auth'));
const Landing = lazy(() => import('@/pages/Landing'));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="doc-o-clock-theme">
      <OnboardingProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/provider-portal" element={<ProviderPortal />} />
            <Route path="/create-admin" element={<CreateAdmin />} />
            
            {/* Protected routes */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
            <Route path="/symptoms" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/admin-dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            <Route path="/superadmin-dashboard" element={<ProtectedRoute superAdminOnly><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/provider-dashboard" element={<ProtectedRoute providerOnly><ProviderDashboard /></ProtectedRoute>} />
            <Route path="/application-status" element={<ProtectedRoute><ApplicationStatus /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
            <Route path="/video-consultation/:appointmentId" element={<ProtectedRoute><VideoConsultation /></ProtectedRoute>} />
            <Route path="/admin-wallet" element={<ProtectedRoute adminOnly><AdminWallet /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            
            {/* Fallback routes */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </OnboardingProvider>
    </ThemeProvider>
  );
}

export default App;
