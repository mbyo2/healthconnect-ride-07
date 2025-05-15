
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
import { Menu, Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";
import { UserRole, AdminLevel } from "@/types/user";
import { useDeviceType } from "@/hooks/use-device-type";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const { isDesktop } = useDeviceType();
  
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
    <header className="bg-background/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 border-b h-16 shadow-sm">
      <div className="container flex h-full items-center justify-between px-4">
        {/* Logo on the left */}
        <Link to="/" className="font-bold text-xl text-trust-600">
          Doc&apos; O Clock
        </Link>
        
        {/* Actions on the right */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[140px] pl-8 h-9 focus:w-[180px] transition-all duration-300"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 sm:hidden"
            onClick={() => navigate("/search")}
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                {user ? (
                  <Avatar className="h-8 w-8 ring-2 ring-trust-100">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback className="bg-trust-100 text-trust-600">{user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link to="/documentation">Documentation</Link>
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
                  <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/register">Register</Link>
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
