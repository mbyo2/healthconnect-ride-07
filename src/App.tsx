import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import CreateAdmin from '@/pages/CreateAdmin';
import AdminWallet from '@/pages/AdminWallet';

// Lazy-loaded components
const ProfileSetup = lazy(() => import('@/pages/ProfileSetup'));
const Symptoms = lazy(() => import('@/pages/Symptoms'));
const ProviderPortal = lazy(() => import('@/pages/ProviderPortal').then(module => ({ default: module.ProviderPortal })));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const ProviderDashboard = lazy(() => import('@/pages/ProviderDashboard'));
const ApplicationStatus = lazy(() => import('@/pages/ApplicationStatus'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const VideoConsultation = lazy(() => import('@/pages/VideoConsultation'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="doc-o-clock-theme">
      <AuthProvider>
        <Router>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/provider-portal" element={<ProviderPortal />} />
              <Route path="/create-admin" element={<CreateAdmin />} />
              
              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/profile-setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
              <Route path="/symptoms" element={<ProtectedRoute><Symptoms /></ProtectedRoute>} />
              <Route path="/admin-dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
              <Route path="/superadmin-dashboard" element={<ProtectedRoute superAdminOnly><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/provider-dashboard" element={<ProtectedRoute providerOnly><ProviderDashboard /></ProtectedRoute>} />
              <Route path="/application-status" element={<ProtectedRoute><ApplicationStatus /></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
              <Route path="/video-consultation/:appointmentId" element={<ProtectedRoute><VideoConsultation /></ProtectedRoute>} />
              <Route path="/admin-wallet" element={<ProtectedRoute adminOnly><AdminWallet /></ProtectedRoute>} />
              
              {/* Fallback routes */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
