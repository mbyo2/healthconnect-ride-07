import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { useSearch } from "@/context/SearchContext";
import { Home, Calendar, MessageSquare, Users, ShoppingCart, Heart, Settings, User, Brain, Shield, Activity, BarChart3, AlertTriangle, Zap } from "lucide-react";
import { DesktopNavMenu } from "@/components/navigation/DesktopNavMenu";
import { DesktopUserMenu } from "@/components/navigation/DesktopUserMenu";
import { AppLogo } from "@/components/ui/AppLogo";
import { useUserRoles } from "@/context/UserRolesContext";
import { hasRoutePermission } from "@/utils/rolePermissions";

export function DesktopNav() {
  const location = useLocation();
  const { user, signOut, profile, isAuthenticated } = useAuth();
  const { availableRoles } = useUserRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearchQuery } = useSearch();
  const navigate = useNavigate();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchTerm);

    if (location.pathname !== "/search") {
      navigate('/search');
    }
  }, [location.pathname, searchTerm, setSearchQuery, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [signOut, navigate]);

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

  // Enhanced secondary items for comprehensive access including Phase 5 features
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
      to: "/medical-records",
      label: "Medical Records",
      icon: <Heart className="h-4 w-4 mr-2" />
    },
    {
      to: "/video-consultations",
      label: "Video Consultations",
      icon: <MessageSquare className="h-4 w-4 mr-2" />
    },
    // Advanced Healthcare Features
    {
      to: "/advanced-dashboard",
      label: "Advanced Healthcare Platform",
      icon: <Zap className="h-4 w-4 mr-2" />,
      badge: "NEW"
    },
    {
      to: "/ai-diagnostics",
      label: "AI Diagnostic Assistant",
      icon: <Brain className="h-4 w-4 mr-2" />,
      badge: "AI"
    },
    {
      to: "/blockchain-records",
      label: "Blockchain Medical Records",
      icon: <Shield className="h-4 w-4 mr-2" />,
      badge: "SECURE"
    },
    {
      to: "/iot-monitoring",
      label: "IoT Health Monitoring",
      icon: <Activity className="h-4 w-4 mr-2" />,
      badge: "LIVE"
    },
    {
      to: "/health-analytics",
      label: "Health Data Analytics",
      icon: <BarChart3 className="h-4 w-4 mr-2" />
    },
    {
      to: "/emergency-response",
      label: "Emergency Response",
      icon: <AlertTriangle className="h-4 w-4 mr-2" />,
      badge: "24/7"
    },
    // Management Systems
    {
      to: "/pharmacy-management",
      label: "Pharmacy Management",
      icon: <ShoppingCart className="h-4 w-4 mr-2" />,
      badge: "PMS"
    },
    {
      to: "/hospital-management",
      label: "Hospital Management",
      icon: <Activity className="h-4 w-4 mr-2" />,
      badge: "HMS"
    },
    {
      to: "/lab-management",
      label: "Lab Management",
      icon: <Activity className="h-4 w-4 mr-2" />,
      badge: "LMS"
    },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4 mr-2" />
    }
  ];

  return (
    <header
      className="bg-background sticky top-0 z-50 border-b-2 border-trust-100 px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 shadow-lg"
      role="banner"
    >
      <div className="container mx-auto flex items-center justify-between py-4 max-w-8xl">
        <div className="flex items-center gap-8">
          {/* Enhanced Logo */}
          <AppLogo size="lg" className="mr-4" />

          {/* Main navigation with enhanced visibility and accessibility */}
          <nav className="hidden lg:flex items-center space-x-2" role="navigation" aria-label="Main navigation">
            {mainNavItems.map((item, index) => (
              <Button
                key={index}
                variant={item.active ? "default" : "ghost"}
                asChild
                className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 ${item.active
                  ? "bg-trust-600 text-white shadow-lg"
                  : "hover:bg-trust-50 hover:text-trust-700"
                  }`}
              >
                <Link
                  to={item.to}
                  aria-label={item.label}
                  aria-current={item.active ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </Button>
            ))}

            <DesktopNavMenu secondaryNavItems={secondaryNavItems.filter(item => hasRoutePermission(availableRoles, item.to))} />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Enhanced Search with accessibility */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden md:block"
            role="search"
            aria-label="Search for healthcare providers"
          >
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Find doctors, clinics, specialists..."
              className="w-[250px] pl-10 md:w-[280px] lg:w-[320px] xl:w-[360px] 2xl:w-[400px] rounded-xl border-trust-200 focus:border-trust-400 focus:ring-trust-200"
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search for doctors, clinics, or specialists"
            />
          </form>

          <ThemeToggle />

          {/* Enhanced User menu with accessibility */}
          {isAuthenticated && user ? (
            <DesktopUserMenu user={user} profile={profile} onLogout={handleLogout} />
          ) : (
            <div className="flex items-center gap-3" role="group" aria-label="Authentication actions">
              <Button variant="outline" asChild className="rounded-xl border-trust-200 hover:bg-trust-50">
                <Link to="/auth" aria-label="Sign in to your account">Sign In</Link>
              </Button>
              <Button asChild className="rounded-xl bg-trust-600 hover:bg-trust-700">
                <Link to="/auth" aria-label="Create a new account">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
