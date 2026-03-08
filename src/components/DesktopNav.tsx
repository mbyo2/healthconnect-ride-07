import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { useSearch } from "@/context/SearchContext";
import { Home, Calendar, MessageSquare, Users, ShoppingCart, Heart, Settings, User, Brain, Shield, Activity, BarChart3, AlertTriangle, Zap, Package, Pill, Stethoscope, Building2 } from "lucide-react";
import { DesktopNavMenu } from "@/components/navigation/DesktopNavMenu";
import { DesktopUserMenu } from "@/components/navigation/DesktopUserMenu";
import { AppLogo } from "@/components/ui/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
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

  const mainNavItems = [
    { to: "/", label: "Home", icon: <Home className="h-4 w-4" />, active: location.pathname === "/" || location.pathname === "/home" },
    { to: "/search", label: "Find Care", icon: <Search className="h-4 w-4" />, active: location.pathname === "/search" },
  ];

  if (isAuthenticated) {
    mainNavItems.push(
      { to: "/appointments", label: "My Care", icon: <Calendar className="h-4 w-4" />, active: location.pathname.includes("appointment") },
      { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" }
    );
  }

  const secondaryNavItems = [
    { to: "/connections", label: "My Providers", icon: <Users className="h-4 w-4 mr-2" /> },
    { to: "/profile", label: "My Profile", icon: <User className="h-4 w-4 mr-2" /> },
    { to: "/marketplace-users", label: "Healthcare Marketplace", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
    { to: "/prescriptions", label: "Prescriptions", icon: <Pill className="h-4 w-4 mr-2" /> },
    { to: "/symptoms", label: "Health Tracking", icon: <Heart className="h-4 w-4 mr-2" /> },
    { to: "/medical-records", label: "Medical Records", icon: <Heart className="h-4 w-4 mr-2" /> },
    { to: "/video-consultations", label: "Video Consultations", icon: <MessageSquare className="h-4 w-4 mr-2" /> },
    { to: "/advanced-dashboard", label: "Advanced Healthcare", icon: <Zap className="h-4 w-4 mr-2" />, badge: "NEW" },
    { to: "/ai-diagnostics", label: "AI Diagnostic Assistant", icon: <Brain className="h-4 w-4 mr-2" />, badge: "AI" },
    { to: "/blockchain-records", label: "Blockchain Records", icon: <Shield className="h-4 w-4 mr-2" /> },
    { to: "/iot-monitoring", label: "IoT Monitoring", icon: <Activity className="h-4 w-4 mr-2" /> },
    { to: "/health-analytics", label: "Health Analytics", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
    { to: "/emergency-response", label: "Emergency Response", icon: <AlertTriangle className="h-4 w-4 mr-2" /> },
    { to: "/pharmacy-management", label: "Pharmacy Management", icon: <Package className="h-4 w-4 mr-2" /> },
    { to: "/hospital-management", label: "Hospital Management", icon: <Building2 className="h-4 w-4 mr-2" /> },
    { to: "/lab-management", label: "Lab Management", icon: <Stethoscope className="h-4 w-4 mr-2" /> },
    { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
  ];

  return (
    <header className="bg-background sticky top-0 z-50 border-b border-border" role="banner">
      <div className="mx-auto flex items-center justify-between h-16 px-4 md:px-6 lg:px-8 xl:px-12 max-w-screen-2xl">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <AppLogo size="sm" className="shrink-0" />

          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {mainNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

            <DesktopNavMenu secondaryNavItems={secondaryNavItems.filter(item => hasRoutePermission(availableRoles, item.to))} />
          </nav>
        </div>

        {/* Right: Search + Actions */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search doctors, specialties..."
              className="w-[220px] lg:w-[280px] xl:w-[340px] pl-9 h-9 rounded-lg bg-muted/50 border-transparent focus:bg-background focus:border-border"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>

          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated && user ? (
            <DesktopUserMenu user={user} profile={profile} onLogout={handleLogout} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?tab=signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
