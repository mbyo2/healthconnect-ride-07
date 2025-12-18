import { useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";
import { UserRole, AdminLevel } from "@/types/user";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ui/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const { isDesktop } = useDeviceType();

  // Sync role info
  if (profile?.role !== userRole) {
    setUserRole(profile?.role as UserRole);
    setAdminLevel(profile?.admin_level as AdminLevel);
  }

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut, navigate]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
    if (location.pathname !== "/search") {
      navigate("/search");
    }
  }, [location.pathname, navigate, searchTerm, setSearchQuery]);

  // Render only on mobile (desktop uses separate nav)
  if (isDesktop) return null;

  return (
    <header className="modern-header sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-trust-100">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo and Name on one line */}
        <div className="flex items-center flex-shrink-0">
          <AppLogo size="sm" className="gap-1.5" />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {user && (
            <>
              {/* Mobile search button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigate("/search")}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Notifications using the specialized component */}
              <NotificationBell />
            </>
          )}

          <ThemeToggle />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full ml-1">
                {user ? (
                  <Avatar className="h-8 w-8 ring-1 ring-blue-100">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-lg max-h-[80vh] overflow-y-auto z-50">
              {user ? (
                <>
                  <DropdownMenuLabel className="pb-2">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-500">My Account</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">Profile &amp; Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/appointments">My Appointments</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/documentation">Help &amp; Support</Link>
                  </DropdownMenuItem>
                  {userRole === "health_personnel" && (
                    <DropdownMenuItem asChild>
                      <Link to="/provider-dashboard">Provider Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  {(adminLevel === "admin" || adminLevel === "superadmin") && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin-dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">Sign out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/auth" className="font-medium">Sign In</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/auth?tab=signup" className="font-medium">Create Account</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div >
    </header >
  );
}
