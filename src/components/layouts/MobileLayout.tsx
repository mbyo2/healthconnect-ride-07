import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
}

export const MobileLayout = ({ children }: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 pt-14 pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};