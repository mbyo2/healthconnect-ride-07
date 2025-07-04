
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { useSearch } from "@/context/SearchContext";
import { Home, Calendar, MessageSquare, Users, ShoppingCart, Heart, Settings, User } from "lucide-react";
import { DesktopNavMenu } from "@/components/navigation/DesktopNavMenu";
import { DesktopUserMenu } from "@/components/navigation/DesktopUserMenu";

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
      window.location.href = "/auth";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut]);
  
  // Enhanced main navigation items for better user experience
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
        label: "My Care",
        icon: <Calendar className="h-5 w-5 mr-2" />,
        active: location.pathname.includes("appointment")
      },
      {
        to: "/chat",
        label: "Messages",
        icon: <MessageSquare className="h-5 w-5 mr-2" />,
        active: location.pathname === "/chat"
      },
      {
        to: "/connections",
        label: "My Providers",
        icon: <Users className="h-5 w-5 mr-2" />,
        active: location.pathname === "/connections"
      }
    );
  }
  
  // Enhanced secondary items for comprehensive access
  const secondaryNavItems = [
    {
      to: "/profile",
      label: "My Profile",
      icon: <User className="h-4 w-4 mr-2" />
    },
    {
      to: "/marketplace-users",
      label: "Healthcare Marketplace",
      icon: <ShoppingCart className="h-4 w-4 mr-2" />
    },
    {
      to: "/prescriptions",
      label: "Prescriptions",
      icon: <Heart className="h-4 w-4 mr-2" />
    },
    {
      to: "/symptoms",
      label: "Health Tracking",
      icon: <Heart className="h-4 w-4 mr-2" />
    },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4 mr-2" />
    }
  ];
  
  return (
    <header className="bg-background sticky top-0 z-50 border-b-2 border-trust-100 px-6 shadow-lg">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          {/* Enhanced Logo */}
          <Link to="/" className="font-bold text-3xl logo-link text-trust-600 hover:text-trust-700 transition-colors">
            Doc&apos; O Clock
          </Link>
          
          {/* Main navigation with enhanced visibility */}
          <div className="hidden lg:flex items-center space-x-2">
            {mainNavItems.map((item, index) => (
              <Button 
                key={index} 
                variant={item.active ? "default" : "ghost"} 
                asChild
                className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 ${
                  item.active 
                    ? "bg-trust-600 text-white shadow-lg" 
                    : "hover:bg-trust-50 hover:text-trust-700"
                }`}
              >
                <Link to={item.to}>
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))}
            
            <DesktopNavMenu secondaryNavItems={secondaryNavItems} />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Enhanced Search */}
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Find doctors, clinics, specialists..."
              className="w-[250px] pl-10 md:w-[250px] lg:w-[350px] rounded-xl border-trust-200 focus:border-trust-400 focus:ring-trust-200"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>
          
          <ThemeToggle />
          
          {/* Enhanced User menu */}
          {isAuthenticated && user ? (
            <DesktopUserMenu user={user} profile={profile} onLogout={handleLogout} />
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild className="rounded-xl border-trust-200 hover:bg-trust-50">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="rounded-xl bg-trust-600 hover:bg-trust-700">
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
