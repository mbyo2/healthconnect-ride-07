
import { Home, Search, Calendar, MessageSquare, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";
import { useDeviceType } from "@/hooks/use-device-type";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const { isDesktop } = useDeviceType();
  const touchFeedbackProps = useTouchFeedback({ 
    rippleColor: 'var(--primary)', 
    rippleOpacity: 0.15 
  });
  
  // Don't render on desktop
  if (isDesktop) {
    return null;
  }
  
  // Define essential navigation items
  const navItems = [
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
  ];

  // Menu items moved to the sheet
  const menuItems = [
    { to: "/profile", label: "Profile" },
    { to: "/testing", label: "Testing" },
    { to: "/documentation", label: "Documentation" },
    { to: "/settings", label: "Settings" }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm z-50 shadow-md">
      <div className="flex items-center justify-evenly">
        {navItems.map((item, index) => (
          <Link 
            key={index}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-2",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
            {...touchFeedbackProps}
          >
            <div className={cn(
              "flex flex-col items-center justify-center relative",
              item.active && "after:content-[''] after:absolute after:-bottom-1 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full"
            )}>
              {item.icon}
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </div>
          </Link>
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <button 
              className="flex flex-1 flex-col items-center justify-center py-2 text-muted-foreground"
              {...touchFeedbackProps}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80vw]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              {user && (
                <div className="flex items-center gap-3 py-3 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.user_metadata?.name || user.email}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              )}
            </SheetHeader>
            <div className="mt-6 space-y-1">
              {menuItems.map((item, idx) => (
                <Button 
                  key={idx}
                  variant="ghost" 
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
                  asChild
                >
                  <Link to={item.to}>
                    {item.label}
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
