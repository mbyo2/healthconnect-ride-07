
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
import { useState } from "react";
import { useSearch } from "@/context/SearchContext";
import { Home, Calendar, MessageSquare } from "lucide-react";

export function DesktopNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();

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

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  // Define main essential navigation items
  const mainNavItems = [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5 mr-2" />,
      active: location.pathname === "/"
    },
    {
      to: "/search",
      label: "Find Care",
      icon: <Search className="h-5 w-5 mr-2" />,
      active: location.pathname === "/search"
    },
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
  ];
  
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
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-2xl">
            Doc&apos; O Clock
          </Link>
          
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
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar>
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={user?.email || ""} />
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
                {user?.role === "health_personnel" && (
                  <DropdownMenuItem asChild>
                    <Link to="/provider-dashboard">
                      Provider Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {user?.role === "admin" && (
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
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
