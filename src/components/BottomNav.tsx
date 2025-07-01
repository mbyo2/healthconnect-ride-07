
import { Home, Search, Calendar, MessageSquare, Menu, Heart, Users, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";
import { useDeviceType } from "@/hooks/use-device-type";
import { useAuth } from "@/context/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useCallback, useMemo } from "react";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const { isDesktop } = useDeviceType();
  const { isAuthenticated } = useAuth();
  const touchFeedbackProps = useTouchFeedback({ 
    rippleColor: 'var(--primary)', 
    rippleOpacity: 0.15 
  });
  
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
    },
    { 
      to: "/settings", 
      label: "Settings", 
      description: "App preferences and account settings",
      icon: <Menu className="h-5 w-5" />
    }
  ], []);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      {/* Enhanced backdrop with better contrast */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t-2 border-trust-200 shadow-2xl" />
      
      {/* Navigation content with larger touch targets */}
      <div className="relative flex items-center justify-evenly h-20 px-2">
        {navItems.map((item, index) => (
          <Link 
            key={index}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all duration-300 ease-out group relative overflow-hidden min-h-[64px]",
              item.active 
                ? "text-trust-600 scale-105 shadow-lg" 
                : "text-muted-foreground hover:text-trust-500 hover:scale-105"
            )}
            {...touchFeedbackProps}
            aria-label={`${item.label} - ${item.description}`}
          >
            {/* Enhanced active indicator background */}
            {item.active && (
              <div className="absolute inset-0 bg-gradient-to-br from-trust-50 to-trust-100 rounded-2xl animate-in fade-in duration-300 shadow-inner" />
            )}
            
            {/* Icon container with better spacing */}
            <div className={cn(
              "relative flex flex-col items-center justify-center space-y-2 transition-transform duration-200",
              item.active && "transform-gpu"
            )}>
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                item.active && "bg-trust-100/70 shadow-sm"
              )}>
                {item.icon}
              </div>
              
              {/* Enhanced label with better readability */}
              <span className={cn(
                "text-xs font-semibold leading-tight tracking-wide text-center",
                item.active ? "text-trust-700" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              
              {/* Enhanced active indicator */}
              {item.active && (
                <div className="absolute -bottom-1 w-2 h-2 bg-trust-500 rounded-full animate-in zoom-in duration-200 shadow-sm" />
              )}
            </div>
          </Link>
        ))}

        {/* Enhanced Menu Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button 
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-3 px-2 rounded-2xl transition-all duration-300 ease-out min-h-[64px]",
                "text-muted-foreground hover:text-trust-500 hover:scale-105 relative overflow-hidden"
              )}
              {...touchFeedbackProps}
              aria-label="More options and settings"
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-2 rounded-xl">
                  <Menu className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold leading-tight tracking-wide">More</span>
              </div>
            </button>
          </SheetTrigger>
          
          <SheetContent 
            side="right" 
            className="w-[90vw] max-w-sm bg-background/98 backdrop-blur-xl border-trust-200 shadow-2xl"
          >
            <SheetHeader className="pb-6">
              <SheetTitle className="text-trust-600 text-2xl font-bold">Quick Access</SheetTitle>
              {user && (
                <div className="flex items-center gap-4 py-4 px-3 bg-gradient-to-r from-trust-50 to-trust-100 rounded-2xl border border-trust-200 shadow-sm">
                  <Avatar className="h-14 w-14 ring-2 ring-trust-300 shadow-sm">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback className="bg-trust-200 text-trust-700 font-bold text-lg">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <span className="font-bold text-trust-800 text-lg">
                      {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-sm text-trust-600 truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
              )}
            </SheetHeader>
            
            <div className="space-y-3">
              {menuItems.map((item, idx) => (
                <Button 
                  key={idx}
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start h-auto p-4 text-left transition-all duration-200 rounded-xl",
                    "hover:bg-trust-50 hover:text-trust-700 hover:scale-[1.02] hover:shadow-md",
                    "active:scale-[0.98] group border border-transparent hover:border-trust-200"
                  )}
                  asChild
                >
                  <Link to={item.to} className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-trust-100 text-trust-600 group-hover:bg-trust-200 transition-colors">
                      {item.icon}
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold group-hover:text-trust-800 text-base">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-trust-600">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
