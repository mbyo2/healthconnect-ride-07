
import { Home, Search, Calendar, MessageSquare, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";
import { useDeviceType } from "@/hooks/use-device-type";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  
  // Define essential navigation items only - reduced to the most important 4
  const navItems = [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      active: location.pathname === "/"
    },
    {
      to: "/search",
      label: "Search",
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
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm px-1 py-2 z-50 lg:hidden shadow-lg">
      <div className="flex items-center justify-between overflow-x-auto">
        {navItems.map((item, index) => (
          <Button 
            key={index}
            variant="ghost" 
            size="icon" 
            asChild 
            className={`flex flex-col items-center justify-center gap-1 h-auto py-1 min-w-[3.5rem] ${item.active ? 'after:content-[""] after:w-1/2 after:h-1 after:bg-primary after:absolute after:bottom-0 after:rounded-full' : ''}`}
            {...touchFeedbackProps}
          >
            <Link to={item.to} className={item.active ? "text-primary" : "text-muted-foreground"}>
              {item.icon}
              <span className="text-[9px]">{item.label}</span>
            </Link>
          </Button>
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="flex flex-col items-center justify-center gap-1 h-auto py-1 min-w-[3.5rem]"
              {...touchFeedbackProps}
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[80vw]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                {user && (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                      <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <span>{user.email}</span>
                  </>
                )}
              </SheetDescription>
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
