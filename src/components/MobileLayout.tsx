import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { FloatingAIChat } from "@/components/FloatingAIChat";
import { DesktopNav } from "@/components/DesktopNav";
import { useDeviceType } from "@/hooks/use-device-type";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
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

const STANDALONE_ROUTES = ['/landing', '/auth', '/reset-password', '/terms', '/privacy', '/pricing'];
// Prefix routes rendered full-screen (dynamic segments like /video-call/:roomId)
const STANDALONE_PREFIXES = ['/video-call'];

export const MobileLayout = ({ children, isLoading }: MobileLayoutProps) => {
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Standalone pages render without global chrome (full-screen call mode hides
  // Header, BottomNav and the floating AI chat during active consultations)
  const isStandalone = STANDALONE_ROUTES.includes(location.pathname) || 
    STANDALONE_PREFIXES.some(prefix => location.pathname.startsWith(prefix)) ||
    (location.pathname === '/' && !isAuthenticated);
  
  if (isStandalone) {
    return <>{children}</>;
  }

  if (isDesktop) {
    return (
      <SidebarProvider>
        {/* Desktop scroll context: page-level sticky bars (.doc-page-header)
            dock at 0 — DesktopNav is in-flow above this <main>, so the
            scrollport top already sits below the nav. (The pre-2026-11-11
            hard-coded 4.5rem dock displaced those bars over content.) */}
        <div
          className="flex flex-col min-h-screen bg-background w-full"
          style={{ "--doc-sticky-top": "0px" } as CSSProperties}
        >
          <DesktopNav />
          {/* scroll-pt: anchored/scrolled-to sections land BELOW the
              docked page header (~104px worst case), never under it
              (CEO rule 2026-11-11: sections don't hide content). */}
          <main id="main-content" className="flex-1 overflow-auto scroll-pt-[6.5rem]">
            {/* One content column for the whole signed-in product:
                1200px (max-w-content), matching the header — the
                PayPal/Stripe anatomy of a calm top bar over a single
                centred column. */}
            <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              {children}
            </div>
          </main>
          <OfflineBanner />
          <OfflineIndicator />
          <AccessibilityMenu />
          {isAuthenticated && <FloatingAIChat />}
        </div>
      </SidebarProvider>
    );
  }

  return (
    // Mobile scroll context: the fixed h-16 Header overlays this <main>,
    // so page-level sticky bars dock at 4.5rem (below the header + 8px
    // clearance). Bottom padding pb-40 guarantees the last content can
    // always scroll clear of the floating BottomNav + FAB stack
    // (CEO phone report 2026-11-11: content hidden behind them).
    <div
      className="flex flex-col min-h-screen bg-background"
      style={{ "--doc-sticky-top": "4.5rem" } as CSSProperties}
    >
      <Header />
      <main
        id="main-content"
        role="main"
        className={cn(
          "flex-1 pt-16 overflow-y-auto overflow-x-hidden scroll-pt-[11rem]",
          isAuthenticated ? "pb-40" : "pb-6",
          "min-h-0"
        )}
      >
        <div className="mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
      <OfflineBanner />
      <OfflineIndicator />
      <AccessibilityMenu />
      {isAuthenticated && <FloatingAIChat />}
    </div>
  );
}
