import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { useDeviceType } from "@/hooks/use-device-type";
import { ReactNode, useEffect, useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { useLocation } from "react-router-dom";
import { OfflineIndicator } from "@/hooks/use-network-status";
import { OfflineBanner } from "@/components/shared/OfflineBanner";

interface MobileLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
}

const STANDALONE_ROUTES = ['/landing', '/auth', '/reset-password', '/terms', '/privacy'];

export const MobileLayout = ({ children, isLoading }: MobileLayoutProps) => {
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Standalone pages render without global chrome
  const isStandalone = STANDALONE_ROUTES.includes(location.pathname) || 
    (location.pathname === '/' && !isAuthenticated);
  
  if (isStandalone) {
    return <>{children}</>;
  }

  if (isDesktop) {
    return (
      <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background w-full">
          <DesktopNav />
          <main id="main-content" className="flex-1 overflow-auto">
            <div className="mx-auto max-w-screen-xl px-6 lg:px-8 py-6 space-y-6">
              {children}
            </div>
          </main>
          <AccessibilityMenu />
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main
        id="main-content"
        role="main"
        className={cn(
          "flex-1 pt-14 overflow-y-auto overflow-x-hidden",
          isAuthenticated ? "pb-24" : "pb-6",
          "min-h-0"
        )}
      >
        <div className="mx-auto max-w-screen-xl px-4 py-4 space-y-6">
          {children}
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
      <OfflineBanner />
      <OfflineIndicator />
      <AccessibilityMenu />
    </div>
  );
}
