import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { DesktopNav } from "@/components/DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MobileLayoutProps {
  children: ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <DesktopNav />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 pt-14 pb-16 px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};