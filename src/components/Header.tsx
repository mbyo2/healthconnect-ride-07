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
import { CurrencyToggle } from "@/components/CurrencyToggle";
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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white dark:bg-slate-900 backdrop-blur-xl border-b border-[#e6e9ef] dark:border-slate-800 shadow-xs">
      <div className="flex h-16 items-center justify-between px-4">
        <AppLogo size="sm" className="gap-2 shrink-0" />

        <div className="flex items-center gap-2">
          {user && (
            <>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => navigate("/search")}>
                <Search className="h-5 w-5" />
              </Button>
              <NotificationBell />
            </>
          )}

          <CurrencyToggle />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl ml-2">
                {user ? (
                  <Avatar className="h-9 w-9 ring-2 ring-[#0073ea]">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback className="bg-[#e5f0ff] text-[#0073ea] text-xs font-extrabold">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[60] border border-[#e6e9ef] rounded-xl bg-white dark:bg-slate-900 shadow-lg">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    <div className="text-sm font-semibold truncate">{user.email}</div>
                    <div className="text-xs text-muted-foreground">My Account</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link to="/workos" className="font-medium text-[#0073ea]">Monday WorkOS Board</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/profile" className="font-medium">Profile & Settings</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/appointments" className="font-medium">My Appointments</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/documentation" className="font-medium">Help & Support</Link></DropdownMenuItem>
                  {userRole === "health_personnel" && (
                    <DropdownMenuItem asChild><Link to="/provider-dashboard" className="font-medium">Provider Dashboard</Link></DropdownMenuItem>
                  )}
                  {(adminLevel === "admin" || adminLevel === "superadmin") && (
                    <DropdownMenuItem asChild><Link to="/admin-dashboard" className="font-medium">Admin Dashboard</Link></DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-medium">Sign out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild><Link to="/auth" className="font-semibold">Sign In</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to="/auth?tab=signup" className="font-semibold">Create Account</Link></DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
