
import { Home, Search, Calendar, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/hooks/use-session";

export function BottomNav() {
  const location = useLocation();
  const { session, user } = useSession();
  const role = user?.role;

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-3 py-2 z-50 md:hidden">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" className={location.pathname === "/" ? "text-primary" : ""}>
            <Home className="h-6 w-6" />
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild>
          <Link to="/search" className={location.pathname === "/search" ? "text-primary" : ""}>
            <Search className="h-6 w-6" />
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild>
          <Link 
            to="/appointments" 
            className={location.pathname.includes("appointment") ? "text-primary" : ""}
          >
            <Calendar className="h-6 w-6" />
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild>
          <Link 
            to="/chat" 
            className={location.pathname === "/chat" ? "text-primary" : ""}
          >
            <MessageSquare className="h-6 w-6" />
          </Link>
        </Button>
        
        <Button variant="ghost" size="icon" asChild>
          <Link 
            to="/profile" 
            className={location.pathname === "/profile" ? "text-primary" : ""}
          >
            <User className="h-6 w-6" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
