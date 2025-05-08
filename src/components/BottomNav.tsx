
import { Home, Search, Calendar, MessageSquare, User, BookOpen, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";
import { useTouchFeedback } from "@/hooks/use-touch-feedback";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const touchFeedbackProps = useTouchFeedback({ 
    rippleColor: 'var(--primary)', 
    rippleOpacity: 0.15 
  });
  
  // Define navigation items
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
    },
    {
      to: "/documentation",
      label: "Docs",
      icon: <BookOpen className="h-5 w-5" />,
      active: location.pathname === "/documentation"
    },
    {
      to: "/testing",
      label: "Testing",
      icon: <CheckSquare className="h-5 w-5" />,
      active: location.pathname === "/testing"
    },
    {
      to: "/profile",
      label: "Profile",
      icon: <User className="h-5 w-5" />,
      active: location.pathname === "/profile"
    }
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm px-1 py-2 z-50 md:hidden shadow-lg">
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
      </div>
    </div>
  );
}
