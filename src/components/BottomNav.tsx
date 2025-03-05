
import { Home, Search, Calendar, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const role = user?.role;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm px-3 py-2 z-50 md:hidden shadow-lg">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild className="flex flex-col items-center justify-center gap-1 h-auto py-1">
          <Link to="/" className={location.pathname === "/" ? "text-primary" : "text-muted-foreground"}>
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild className="flex flex-col items-center justify-center gap-1 h-auto py-1">
          <Link to="/search" className={location.pathname === "/search" ? "text-primary" : "text-muted-foreground"}>
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild className="flex flex-col items-center justify-center gap-1 h-auto py-1">
          <Link 
            to="/appointments" 
            className={location.pathname.includes("appointment") ? "text-primary" : "text-muted-foreground"}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px]">Calendar</span>
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild className="flex flex-col items-center justify-center gap-1 h-auto py-1">
          <Link 
            to="/chat" 
            className={location.pathname === "/chat" ? "text-primary" : "text-muted-foreground"}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px]">Chat</span>
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild className="flex flex-col items-center justify-center gap-1 h-auto py-1">
          <Link 
            to="/profile" 
            className={location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
