
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { MobileLayout } from "@/components/MobileLayout";
import Home from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Appointments from "@/pages/Appointments";
import Search from "@/pages/Search";
import VideoCall from "@/pages/VideoCall";
import Messages from "@/pages/Chat";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { checkServiceWorkerStatus, registerServiceWorker } from "@/utils/service-worker";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Toaster } from "@/components/ui/toaster";
import AppointmentDetails from "@/pages/AppointmentDetails";
import Wallet from "@/pages/Wallet";
import Providers from "@/pages/Providers";
import { OfflineAlert } from "@/components/OfflineAlert";
import PharmacyInventory from "@/pages/PharmacyInventory";
import NotificationsPage from "@/pages/NotificationsPage";
import SettingsPage from "@/pages/SettingsPage";
import Medications from "@/pages/Medications";
import Testing from "@/pages/Testing";
import Documentation from "@/pages/Documentation";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [serviceWorkerActive, setServiceWorkerActive] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Register service worker
      await registerServiceWorker();

      // Check service worker status
      const swStatus = await checkServiceWorkerStatus();
      setServiceWorkerActive(swStatus);

      // Simulate loading delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1500);
    };

    initializeApp();
  }, []);

  return (
    <AuthProvider>
      <OnboardingProvider>
        <Router>
          {isLoading ? (
            <LoadingScreen />
          ) : (
            <Routes>
              <Route
                path="/*"
                element={
                  <MobileLayout isLoading={isLoading}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/appointments/:id" element={<AppointmentDetails />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/video/:roomUrl" element={<VideoCall />} />
                      <Route path="/chat" element={<Messages />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/providers" element={<Providers />} />
                      <Route path="/pharmacy" element={<PharmacyInventory />} />
                      <Route path="/medications" element={<Medications />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/testing" element={<Testing />} />
                      <Route path="/documentation" element={<Documentation />} />
                    </Routes>
                  </MobileLayout>
                }
              />
            </Routes>
          )}
          <Toaster />
          <OfflineAlert />
        </Router>
      </OnboardingProvider>
    </AuthProvider>
  );
}

export default App;
