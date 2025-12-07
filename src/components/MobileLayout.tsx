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

interface MobileLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
}

export const MobileLayout = ({ children, isLoading }: MobileLayoutProps) => {
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Smooth page transition effect
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isDesktop) {
    return (
      <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background w-full">
          <DesktopNav />
          <main
            id="main-content"
            className={cn(
              "flex-1 overflow-auto transition-opacity duration-150 ease-out",
              !isAuthenticated && "w-full",
              isTransitioning ? "opacity-95" : "opacity-100"
            )}
          >
            <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6 max-w-8xl animate-in fade-in duration-200">
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
        className={cn(
          "flex-1 pt-16 overflow-y-auto overflow-x-hidden", 
          isAuthenticated ? "pb-24" : "pb-4",
          "transition-all duration-150 ease-out",
          "min-h-0",
          isTransitioning ? "opacity-95" : "opacity-100"
        )}
      >
        <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6 max-w-8xl min-h-full animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
      {isAuthenticated && <BottomNav />}
      <AccessibilityMenu />
    </div>
  );
}

// TODO: Ensure color contrast meets WCAG standards and add focus management for navigation elements
// TODO: Ensure all interactive elements have ARIA labels and roles
// TODO: Add keyboard navigation and focus management for accessibility
// TODO: Improve color contrast and font sizes for readability
