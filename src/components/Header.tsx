
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/context/SearchContext";
import { cn } from "@/lib/utils";
import { UserRole, AdminLevel } from "@/types/user";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);

  // Update user role when profile changes
  if (profile?.role !== userRole) {
    setUserRole(profile?.role as UserRole);
    setAdminLevel(profile?.admin_level as AdminLevel);
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
    if (location.pathname !== "/search") {
      window.location.href = "/search";
    }
  };
  
  return (
    <header className="bg-background fixed top-0 left-0 right-0 z-50 border-b h-16">
      <div className="container flex h-full items-center justify-between px-4">
        <div className="flex items-center">
          <Link to="/" className="font-bold text-xl mr-4">
            Doc&apos; O Clock
          </Link>
          
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                {user ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                    <AvatarFallback>{user?.email?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user ? (
                <>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
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
