import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { MobileLayout } from "./components/layout/MobileLayout";
import { Toaster } from "sonner";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { UserRolesProvider } from "./context/UserRolesContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "./components/auth/RoleProtectedRoute";
import { SearchProvider } from "./context/SearchContext";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import SymptomsForm from "./pages/SymptomsForm";
import SearchPage from "./pages/SearchPage";
import ProviderDetail from "./pages/ProviderDetail";
import Appointments from "./pages/Appointments";
import ProviderPortal from "./pages/ProviderPortal";
import InstitutionPortal from "./pages/InstitutionPortal";
import ProviderDashboard from "./pages/ProviderDashboard";
import HealthcareApplication from "./pages/HealthcareApplication";
import ApplicationStatus from "./pages/ApplicationStatus";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";

function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const SelectedLayout = isMobile ? MobileLayout : Layout;

  return (
    <ThemeProvider>
      <AuthProvider>
        <UserRolesProvider>
          <SearchProvider>
            <Router>
              <Toaster position="top-center" richColors />
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/home" />} />
                <Route path="/home" element={<SelectedLayout><Home /></SelectedLayout>} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<SelectedLayout><Terms /></SelectedLayout>} />
                <Route path="/privacy" element={<SelectedLayout><Privacy /></SelectedLayout>} />
                <Route path="/contact" element={<SelectedLayout><Contact /></SelectedLayout>} />
                
                {/* Provider portal (custom auth logic inside) */}
                <Route path="/provider-portal" element={<ProviderPortal />} />
                <Route path="/institution-portal" element={<InstitutionPortal />} />
                
                {/* Protected routes for all authenticated users */}
                <Route 
                  path="/profile-setup" 
                  element={<ProtectedRoute><SelectedLayout><ProfileSetup /></SelectedLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/symptoms" 
                  element={<ProtectedRoute><SelectedLayout><SymptomsForm /></SelectedLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/search" 
                  element={<ProtectedRoute><SelectedLayout><SearchPage /></SelectedLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/provider/:id" 
                  element={<ProtectedRoute><SelectedLayout><ProviderDetail /></SelectedLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/appointments" 
                  element={<ProtectedRoute><SelectedLayout><Appointments /></SelectedLayout></ProtectedRoute>} 
                />
                
                {/* Role-specific routes */}
                <Route 
                  path="/provider-dashboard" 
                  element={
                    <RoleProtectedRoute allowedRoles={['health_personnel']}>
                      <SelectedLayout>
                        <ProviderDashboard />
                      </SelectedLayout>
                    </RoleProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/healthcare-application" 
                  element={
                    <ProtectedRoute>
                      <SelectedLayout>
                        <HealthcareApplication />
                      </SelectedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/application-status" 
                  element={
                    <ProtectedRoute>
                      <SelectedLayout>
                        <ApplicationStatus />
                      </SelectedLayout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin routes */}
                <Route 
                  path="/admin-dashboard/*" 
                  element={
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <SelectedLayout>
                        {/* Admin dashboard will be implemented separately */}
                        <div className="container py-8">
                          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                          <p className="mt-4">You have access to admin features.</p>
                        </div>
                      </SelectedLayout>
                    </RoleProtectedRoute>
                  } 
                />
                
                {/* Institution admin routes */}
                <Route 
                  path="/institution-dashboard/*" 
                  element={
                    <RoleProtectedRoute allowedRoles={['institution_admin']}>
                      <SelectedLayout>
                        {/* Institution dashboard will be implemented separately */}
                        <div className="container py-8">
                          <h1 className="text-3xl font-bold">Institution Dashboard</h1>
                          <p className="mt-4">You have access to institution management features.</p>
                        </div>
                      </SelectedLayout>
                    </RoleProtectedRoute>
                  } 
                />
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/home" />} />
              </Routes>
            </Router>
          </SearchProvider>
        </UserRolesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
