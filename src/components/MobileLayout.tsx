
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { useDeviceType } from "@/hooks/use-device-type";
import { ReactNode } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { AccessibilityProvider } from "@/context/AccessibilityContext";

interface MobileLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
}

export const MobileLayout = ({ children, isLoading }: MobileLayoutProps) => {
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isDesktop) {
    return (
      <AccessibilityProvider>
        <SidebarProvider>
          <div className="flex min-h-screen bg-background w-full">
            {isAuthenticated && <DesktopNav />}
            <main 
              id="main-content"
              className={cn(
                "flex-1 overflow-auto",
                !isAuthenticated && "w-full" // Use full width when no nav is shown
              )}
            >
              <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12 py-6 space-y-6 max-w-7xl">
                {children}
              </div>
            </main>
            <AccessibilityMenu />
          </div>
        </SidebarProvider>
      </AccessibilityProvider>
    );
  }

  return (
    <AccessibilityProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main 
          id="main-content"
          className={cn(
            "flex-1 pt-16 overflow-x-hidden", 
            isAuthenticated ? "pb-14" : "pb-0", // Only add bottom padding when nav is present
            "transition-all duration-200 ease-in-out"
          )}
        >
          <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12 space-y-6 max-w-7xl">
            {children}
          </div>
        </main>
        {isAuthenticated && <BottomNav />}
        <AccessibilityMenu />
      </div>
    </AccessibilityProvider>
  );
};
