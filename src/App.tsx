
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MobileLayout } from "./components/MobileLayout";
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
import { ProviderPortal } from "./pages/ProviderPortal";
import { InstitutionPortal } from "./pages/InstitutionPortal";
import ProviderDashboard from "./pages/ProviderDashboard";
import HealthcareApplication from "./pages/HealthcareApplication";
import ApplicationStatus from "./pages/ApplicationStatus";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Documentation from "./pages/Documentation";
import Testing from "./pages/Testing";
import NotificationsPage from "./pages/NotificationsPage";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/SettingsPage";

function App() {
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
                <Route path="/home" element={<MobileLayout><Home /></MobileLayout>} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/terms" element={<MobileLayout><Terms /></MobileLayout>} />
                <Route path="/privacy" element={<MobileLayout><Privacy /></MobileLayout>} />
                <Route path="/contact" element={<MobileLayout><Contact /></MobileLayout>} />
                <Route path="/documentation" element={<MobileLayout><Documentation /></MobileLayout>} />
                
                {/* Provider portal (custom auth logic inside) */}
                <Route path="/provider-portal" element={<ProviderPortal />} />
                <Route path="/institution-portal" element={<InstitutionPortal />} />
                
                {/* Protected routes for all authenticated users */}
                <Route 
                  path="/profile-setup" 
                  element={<ProtectedRoute><MobileLayout><ProfileSetup /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/profile" 
                  element={<ProtectedRoute><MobileLayout><Profile /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/settings" 
                  element={<ProtectedRoute><MobileLayout><SettingsPage /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/testing" 
                  element={<ProtectedRoute><MobileLayout><Testing /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/notifications" 
                  element={<ProtectedRoute><MobileLayout><NotificationsPage /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/chat" 
                  element={<ProtectedRoute><MobileLayout><Chat /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/symptoms" 
                  element={<ProtectedRoute><MobileLayout><SymptomsForm /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/search" 
                  element={<ProtectedRoute><MobileLayout><SearchPage /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/provider/:id" 
                  element={<ProtectedRoute><MobileLayout><ProviderDetail /></MobileLayout></ProtectedRoute>} 
                />
                <Route 
                  path="/appointments" 
                  element={<ProtectedRoute><MobileLayout><Appointments /></MobileLayout></ProtectedRoute>} 
                />
                
                {/* Role-specific routes */}
                <Route 
                  path="/provider-dashboard" 
                  element={
                    <RoleProtectedRoute allowedRoles={['health_personnel']}>
                      <MobileLayout>
                        <ProviderDashboard />
                      </MobileLayout>
                    </RoleProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/healthcare-application" 
                  element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <HealthcareApplication />
                      </MobileLayout>
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/application-status" 
                  element={
                    <ProtectedRoute>
                      <MobileLayout>
                        <ApplicationStatus />
                      </MobileLayout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin routes */}
                <Route 
                  path="/admin-dashboard/*" 
                  element={
                    <RoleProtectedRoute allowedRoles={['admin']}>
                      <MobileLayout>
                        <div className="container py-8">
                          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                          <p className="mt-4">You have access to admin features.</p>
                        </div>
                      </MobileLayout>
                    </RoleProtectedRoute>
                  } 
                />
                
                {/* Institution admin routes */}
                <Route 
                  path="/institution-dashboard/*" 
                  element={
                    <RoleProtectedRoute allowedRoles={['institution_admin']}>
                      <MobileLayout>
                        <div className="container py-8">
                          <h1 className="text-3xl font-bold">Institution Dashboard</h1>
                          <p className="mt-4">You have access to institution management features.</p>
                        </div>
                      </MobileLayout>
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
