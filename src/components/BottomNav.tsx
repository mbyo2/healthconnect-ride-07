
import { Home, Search, Calendar, MessageSquare, Menu } from "lucide-react";
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
  
  // Memoize navigation items to prevent unnecessary re-renders
  const navItems = useMemo(() => [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      active: location.pathname === "/"
    },
    {
      to: "/search",
      label: "Find",
      icon: <Search className="h-5 w-5" />,
      active: location.pathname === "/search"
    },
    {
      to: "/appointments",
      label: "Calendar",
      icon: <Calendar className="h-5 w-5" />,
      active: location.pathname.includes("appointment")
    },
    {
      to: "/chat",
      label: "Chat",
      icon: <MessageSquare className="h-5 w-5" />,
      active: location.pathname === "/chat"
    }
  ], [location.pathname]);

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(() => [
    { to: "/profile", label: "Profile", description: "Manage your personal information" },
    { to: "/settings", label: "Settings", description: "App preferences and notifications" },
    { to: "/prescriptions", label: "Prescriptions", description: "View and manage prescriptions" },
    { to: "/connections", label: "Connections", description: "Healthcare provider network" },
    { to: "/symptoms", label: "Symptoms", description: "Track and log symptoms" },
    { to: "/testing", label: "Testing", description: "App testing and diagnostics" },
    { to: "/documentation", label: "Documentation", description: "Help and support guides" }
  ], []);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-trust-100" />
      
      {/* Navigation content */}
      <div className="relative flex items-center justify-evenly h-16 px-2">
        {navItems.map((item, index) => (
          <Link 
            key={index}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 ease-out group relative overflow-hidden",
              item.active 
                ? "text-trust-600 scale-105" 
                : "text-muted-foreground hover:text-trust-500 hover:scale-105"
            )}
            {...touchFeedbackProps}
          >
            {/* Active indicator background */}
            {item.active && (
              <div className="absolute inset-0 bg-trust-50 rounded-xl animate-in fade-in duration-300" />
            )}
            
            {/* Icon container with animation */}
            <div className={cn(
              "relative flex flex-col items-center justify-center space-y-1 transition-transform duration-200",
              item.active && "transform-gpu"
            )}>
              <div className={cn(
                "p-1 rounded-lg transition-all duration-200",
                item.active && "bg-trust-100/50"
              )}>
                {item.icon}
              </div>
              
              {/* Label */}
              <span className="text-[10px] font-medium leading-none tracking-wide">
                {item.label}
              </span>
              
              {/* Active indicator dot */}
              {item.active && (
                <div className="absolute -bottom-2 w-1 h-1 bg-trust-500 rounded-full animate-in zoom-in duration-200" />
              )}
            </div>
          </Link>
        ))}

        {/* Menu Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button 
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-300 ease-out",
                "text-muted-foreground hover:text-trust-500 hover:scale-105 relative overflow-hidden"
              )}
              {...touchFeedbackProps}
            >
              <div className="flex flex-col items-center justify-center space-y-1">
                <div className="p-1 rounded-lg">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none tracking-wide">More</span>
              </div>
            </button>
          </SheetTrigger>
          
          <SheetContent 
            side="right" 
            className="w-[85vw] bg-background/95 backdrop-blur-xl border-trust-100"
          >
            <SheetHeader className="pb-6">
              <SheetTitle className="text-trust-600 text-xl">Menu</SheetTitle>
              {user && (
                <div className="flex items-center gap-3 py-4 px-2 bg-trust-50/50 rounded-xl border border-trust-100">
                  <Avatar className="h-12 w-12 ring-2 ring-trust-200">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback className="bg-trust-100 text-trust-600 font-semibold">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <span className="font-semibold text-trust-700">
                      {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </div>
              )}
            </SheetHeader>
            
            <div className="space-y-2">
              {menuItems.map((item, idx) => (
                <Button 
                  key={idx}
                  variant="ghost" 
                  className={cn(
                    "w-full justify-start h-auto p-4 text-left transition-all duration-200",
                    "hover:bg-trust-50 hover:text-trust-600 hover:scale-[1.02] hover:shadow-sm",
                    "active:scale-[0.98] group"
                  )}
                  asChild
                >
                  <Link to={item.to} className="flex flex-col items-start gap-1">
                    <span className="font-medium group-hover:text-trust-700">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-trust-500">
                      {item.description}
                    </span>
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
