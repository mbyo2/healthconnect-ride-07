
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { Link, useLocation } from "react-router-dom";
import { DesktopNavigation } from "@/components/navigation/DesktopNavigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export function DesktopNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  return (
    <div className="hidden md:flex items-center justify-between py-4 bg-background sticky top-0 z-50 border-b px-6">
      <Link to="/" className="font-bold text-2xl">
        Doc&apos; O Clock
      </Link>
      
      <DesktopNavigation />
      
      <div className="flex items-center gap-4">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                <Avatar>
                  <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                  <AvatarFallback>{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login" onClick={() => { /* Handle logout */ }}>
                  Logout
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
