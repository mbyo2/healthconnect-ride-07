
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode, useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface MobileLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
}

export const MobileLayout = ({ children, isLoading }: MobileLayoutProps) => {
  const isMobile = useIsMobile();
  const { showFeatureHighlight } = useOnboarding();
  
  // Show navigation highlights for mobile users
  useEffect(() => {
    if (isMobile) {
      // Highlight bottom navigation after a delay
      const timer = setTimeout(() => {
        showFeatureHighlight({
          id: "mobile-bottom-nav",
          targetSelector: ".bottom-nav-container",
          title: "Quick Navigation",
          description: "Access all main features from this navigation bar.",
          position: "top",
          showDelay: 1000
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile, showFeatureHighlight]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isMobile) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen bg-background w-full">
          <DesktopNav />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 pt-16 pb-20 overflow-x-hidden">
        <div className="container mx-auto px-4 md:px-6 space-y-6">
          {children}
        </div>
      </main>
      <div className="bottom-nav-container">
        <BottomNav />
      </div>
    </div>
  );
};
