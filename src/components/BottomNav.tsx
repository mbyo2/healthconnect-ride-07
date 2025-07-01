
import { Home, Search, Calendar, MessageSquare, Heart, Users, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { useDeviceType } from "@/hooks/use-device-type";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
import { BottomNavItem } from "@/components/navigation/BottomNavItem";
import { BottomNavMenu } from "@/components/navigation/BottomNavMenu";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  
  // Don't render if not authenticated or on desktop
  if (!isAuthenticated || isDesktop) {
    return null;
  }
  
  // Enhanced navigation items for better accessibility
  const navItems = useMemo(() => [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-6 w-6" />,
      active: location.pathname === "/",
      description: "Dashboard and overview"
    },
    {
      to: "/search",
      label: "Find Care",
      icon: <Search className="h-6 w-6" />,
      active: location.pathname === "/search",
      description: "Find doctors and clinics"
    },
    {
      to: "/appointments",
      label: "My Care",
      icon: <Calendar className="h-6 w-6" />,
      active: location.pathname.includes("appointment"),
      description: "Your appointments"
    },
    {
      to: "/chat",
      label: "Messages",
      icon: <MessageSquare className="h-6 w-6" />,
      active: location.pathname === "/chat",
      description: "Chat with providers"
    }
  ], [location.pathname]);

  // Enhanced menu items for comprehensive access
  const menuItems = useMemo(() => [
    { 
      to: "/profile", 
      label: "My Profile", 
      description: "Personal information and settings",
      icon: <Avatar className="h-5 w-5" />
    },
    { 
      to: "/connections", 
      label: "My Providers", 
      description: "Your healthcare provider network",
      icon: <Users className="h-5 w-5" />
    },
    { 
      to: "/marketplace-users", 
      label: "Find Providers", 
      description: "Browse healthcare marketplace",
      icon: <ShoppingCart className="h-5 w-5" />
    },
    { 
      to: "/prescriptions", 
      label: "Prescriptions", 
      description: "View and manage your medications",
      icon: <Heart className="h-5 w-5" />
    },
    { 
      to: "/symptoms", 
      label: "Health Tracking", 
      description: "Track symptoms and health data",
      icon: <Heart className="h-5 w-5" />
    }
  ], []);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      {/* Enhanced backdrop with better contrast */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t-2 border-trust-200 shadow-2xl" />
      
      {/* Navigation content with larger touch targets */}
      <div className="relative flex items-center justify-evenly h-20 px-2">
        {navItems.map((item, index) => (
          <BottomNavItem key={index} {...item} />
        ))}

        <BottomNavMenu user={user} menuItems={menuItems} />
      </div>
    </div>
  );
}
