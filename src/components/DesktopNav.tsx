
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { useSearch } from "@/context/SearchContext";
import { Home, Calendar, MessageSquare } from "lucide-react";

export function DesktopNav() {
  const location = useLocation();
  const { user, signOut, profile, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);
    
    if (location.pathname !== "/search") {
      window.location.href = "/search";
    }
  }, [location.pathname, searchTerm, setSearchQuery]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut]);
  
  // Define main essential navigation items - show all items regardless of auth status
  const mainNavItems = [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5 mr-2" />,
      active: location.pathname === "/" || location.pathname === "/home"
    },
    {
      to: "/search",
      label: "Find Care",
      icon: <Search className="h-5 w-5 mr-2" />,
      active: location.pathname === "/search"
    }
  ];

  // Add authenticated-only items
  if (isAuthenticated) {
    mainNavItems.push(
      {
        to: "/appointments",
        label: "Appointments",
        icon: <Calendar className="h-5 w-5 mr-2" />,
        active: location.pathname.includes("appointment")
      },
      {
        to: "/chat",
        label: "Messages",
        icon: <MessageSquare className="h-5 w-5 mr-2" />,
        active: location.pathname === "/chat"
      }
    );
  }
  
  // Secondary items for "More" dropdown
  const secondaryNavItems = [
    {
      to: "/profile",
      label: "Profile"
    },
    {
      to: "/documentation",
      label: "Documentation"
    },
    {
      to: "/testing",
      label: "Testing"
    },
    {
      to: "/settings",
      label: "Settings"
    }
  ];
  
  return (
    <header className="bg-background sticky top-0 z-50 border-b px-6">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="font-bold text-2xl logo-link">
            Doc&apos; O Clock
          </Link>
          
          {/* Main navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {mainNavItems.map((item, index) => (
              <Button 
                key={index} 
                variant={item.active ? "default" : "ghost"} 
                asChild
                className="flex items-center"
              >
                <Link to={item.to}>
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center">
                  <MoreHorizontal className="h-5 w-5 mr-2" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {secondaryNavItems.map((item, index) => (
                  <DropdownMenuItem key={index} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[200px] pl-8 md:w-[200px] lg:w-[300px]"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>
          
          <ThemeToggle />
          
          {/* User menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar>
                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || ""} alt={user?.email || ""} />
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
                <DropdownMenuItem asChild>
                  <Link to="/documentation">Documentation</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/testing">Testing</Link>
                </DropdownMenuItem>
                {profile?.role === "health_personnel" && (
                  <DropdownMenuItem asChild>
                    <Link to="/provider-dashboard">
                      Provider Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {(profile?.admin_level === "admin" || profile?.admin_level === "superadmin") && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin-dashboard">
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
