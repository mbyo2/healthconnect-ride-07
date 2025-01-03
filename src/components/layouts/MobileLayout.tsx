import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex min-h-screen bg-background">
        <DesktopNav />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 pt-16 pb-20">
        <div className="container mx-auto px-4 md:px-6 space-y-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};