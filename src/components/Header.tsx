
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
import { Menu, Search, Bell, ShoppingCart } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";
import { UserRole, AdminLevel } from "@/types/user";
import { useDeviceType } from "@/hooks/use-device-type";
import { cn } from "@/lib/utils";
import { AppLogo } from "@/components/ui/AppLogo";
import { useNotifications } from "@/hooks/use-notifications";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const { isDesktop } = useDeviceType();
  const { unreadCount } = useNotifications();
  
  // Update user role when profile changes
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
  
  // Only render on mobile, desktop uses DesktopNav
  if (isDesktop) {
    return null;
  }
  
  return (
    <header className="modern-header">
      <div className="container-modern flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="no-underline">
          <AppLogo size="sm" />
        </div>
        
        {/* Search bar - hidden on very small screens */}
        {user && (
          <form onSubmit={handleSearchSubmit} className="hidden sm:block flex-1 max-w-sm mx-4">
            <div className="search-bar relative">
              <Input
                type="search"
                placeholder="Search providers, specialties..."
                className="search-input pl-10 pr-4 py-2 w-full rounded-xl border-trust-200 focus:border-trust-400 focus:ring-trust-200"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-trust-50 transition-colors">
                <Search className="h-4 w-4 text-trust-600" />
              </button>
            </div>
          </form>
        )}
        
        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              {/* Mobile search button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="sm:hidden h-10 w-10"
                onClick={() => navigate("/search")}
              >
                <Search className="h-5 w-5" />
              </Button>
              
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </>
          )}
          
          <ThemeToggle />
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                {user ? (
                  <Avatar className="h-9 w-9 ring-2 ring-blue-100">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                      {user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white border border-gray-200 shadow-lg max-h-96 overflow-y-auto">
              {user ? (
                <>
                  <DropdownMenuLabel className="pb-2">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-xs text-gray-500">My Account</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      Profile & Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/appointments">My Appointments</Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/documentation">Help & Support</Link>
                  </DropdownMenuItem>
                  
                  {userRole === 'health_personnel' && (
                    <DropdownMenuItem asChild>
                      <Link to="/provider-dashboard">Provider Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  
                  {(adminLevel === 'admin' || adminLevel === 'superadmin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin-dashboard">Admin Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    Sign out
                  </DropdownMenuItem>
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
      </div>
    </header>
  );
}
