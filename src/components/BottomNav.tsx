import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Search, Calendar, MessageSquare, Video } from "lucide-react";

export const BottomNav = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t">
      <div className="flex items-center justify-around h-16">
        <Link
          to="/home"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive("/home")
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Home className="h-5 w-5" />
          Home
        </Link>
        
        <Link
          to="/search"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive("/search")
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Search className="h-5 w-5" />
          Search
        </Link>

        <Link
          to="/appointments"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive("/appointments")
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Calendar className="h-5 w-5" />
          Appointments
        </Link>

        <Link
          to="/chat"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive("/chat")
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <MessageSquare className="h-5 w-5" />
          Chat
        </Link>

        <Link
          to="/video-consultations"
          className={cn(
            "flex flex-col items-center gap-1 text-xs transition-colors",
            isActive("/video-consultations")
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
        >
          <Video className="h-5 w-5" />
          Video
        </Link>
      </div>
    </nav>
  );
};