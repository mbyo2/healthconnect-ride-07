import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSearch } from "@/context/SearchContext";
import { useDeviceType } from "@/hooks/use-device-type";
import { AppLogo } from "@/components/ui/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { setSearchQuery } = useSearch();
  const { isDesktop } = useDeviceType();

  const userRole = profile?.role ?? null;
  const adminLevel = profile?.admin_level ?? null;

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut, navigate]);

  if (isDesktop) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex h-14 items-center justify-between px-4">
        <AppLogo size="sm" className="gap-1.5 shrink-0" />

        <div className="flex items-center gap-1">
          {user && (
            <>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/search")}>
                <Search className="h-5 w-5" />
              </Button>
              <NotificationBell />
            </>
          )}

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full ml-1">
                {user ? (
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[60]">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium truncate">{user.email}</div>
                    <div className="text-xs text-muted-foreground">My Account</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/profile">Profile & Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/appointments">My Appointments</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/documentation">Help & Support</Link></DropdownMenuItem>
                  {userRole === "health_personnel" && (
                    <DropdownMenuItem asChild><Link to="/provider-dashboard">Provider Dashboard</Link></DropdownMenuItem>
                  )}
                  {(adminLevel === "admin" || adminLevel === "superadmin") && (
                    <DropdownMenuItem asChild><Link to="/admin-dashboard">Admin Dashboard</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">Sign out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link to="/auth" className="font-medium">Sign In</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/auth?tab=signup" className="font-medium">Create Account</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
