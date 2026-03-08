import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo } from "react";
import { useSearch } from "@/context/SearchContext";
import {
  Home, Calendar, MessageSquare, Users, ShoppingCart, Heart, Settings, User, Brain,
  Shield, Activity, BarChart3, AlertTriangle, Zap, Package, Pill, Stethoscope,
  Building2, Wallet
} from "lucide-react";
import { DesktopNavMenu } from "@/components/navigation/DesktopNavMenu";
import { DesktopUserMenu } from "@/components/navigation/DesktopUserMenu";
import { AppLogo } from "@/components/ui/AppLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";

export function DesktopNav() {
  const location = useLocation();
  const { user, signOut, profile, isAuthenticated } = useAuth();
  const { availableRoles, isHealthPersonnel, isAdmin, isPatient } = useUserRoles();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();
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

  // Role-specific main nav items (top bar links)
  const mainNavItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { to: "/", label: "Home", icon: <Home className="h-4 w-4" />, active: location.pathname === "/" || location.pathname === "/home" },
        { to: "/search", label: "Find Care", icon: <Search className="h-4 w-4" />, active: location.pathname === "/search" },
      ];
    }

    // Nurse (solo)
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-4 w-4" />, active: location.pathname === "/provider-dashboard" },
        { to: "/appointments", label: "Visits", icon: <Calendar className="h-4 w-4" />, active: location.pathname === "/appointments" },
        { to: "/medical-records", label: "Care", icon: <Heart className="h-4 w-4" />, active: location.pathname === "/medical-records" },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-4 w-4" />, active: location.pathname === "/provider-dashboard" },
        { to: "/appointments", label: "Appointments", icon: <Calendar className="h-4 w-4" />, active: location.pathname === "/appointments" },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" },
        { to: "/ai-diagnostics", label: "AI Assistant", icon: <Brain className="h-4 w-4" />, active: location.pathname === "/ai-diagnostics" },
      ];
    }

    // Pharmacy / Pharmacist
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-portal", label: "Portal", icon: <Package className="h-4 w-4" />, active: location.pathname === "/pharmacy-portal" },
        { to: "/pharmacy-inventory", label: "Inventory", icon: <Pill className="h-4 w-4" />, active: location.pathname === "/pharmacy-inventory" },
        { to: "/prescriptions", label: "Rx", icon: <Heart className="h-4 w-4" />, active: location.pathname === "/prescriptions" },
        { to: "/marketplace", label: "Market", icon: <ShoppingCart className="h-4 w-4" />, active: location.pathname === "/marketplace" },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/admin-dashboard", label: "Dashboard", icon: <Shield className="h-4 w-4" />, active: location.pathname === "/admin-dashboard" },
        { to: "/healthcare-application", label: "Applications", icon: <Users className="h-4 w-4" />, active: location.pathname === "/healthcare-application" },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" },
      ];
    }

    // Institution Admin/Staff
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/institution-dashboard", label: "Dashboard", icon: <Building2 className="h-4 w-4" />, active: location.pathname === "/institution-dashboard" },
        { to: "/institution/appointments", label: "Appointments", icon: <Calendar className="h-4 w-4" />, active: location.pathname === "/institution/appointments" },
        { to: "/institution/patients", label: "Patients", icon: <Users className="h-4 w-4" />, active: location.pathname === "/institution/patients" },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" },
      ];
    }

    // Lab / Lab Technician
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/lab-management", label: "Lab", icon: <Activity className="h-4 w-4" />, active: location.pathname === "/lab-management" },
        { to: "/medical-records", label: "Records", icon: <Heart className="h-4 w-4" />, active: location.pathname === "/medical-records" },
        { to: "/search", label: "Search", icon: <Search className="h-4 w-4" />, active: location.pathname === "/search" },
      ];
    }

    // Default: Patient
    return [
      { to: "/home", label: "Home", icon: <Home className="h-4 w-4" />, active: location.pathname === "/" || location.pathname === "/home" },
      { to: "/search", label: "Find Care", icon: <Search className="h-4 w-4" />, active: location.pathname === "/search" },
      { to: "/appointments", label: "My Care", icon: <Calendar className="h-4 w-4" />, active: location.pathname.includes("appointment") },
      { to: "/chat", label: "Messages", icon: <MessageSquare className="h-4 w-4" />, active: location.pathname === "/chat" },
    ];
  }, [location.pathname, isAuthenticated, isHealthPersonnel, isAdmin, isPatient, availableRoles, isInstitutionAffiliated]);

  // Role-specific "More" menu items
  const secondaryNavItems = useMemo(() => {
    // Nurse (solo)
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-calendar", label: "My Schedule", icon: <Calendar className="h-4 w-4 mr-2" /> },
        { to: "/medications", label: "Medication Admin", icon: <Pill className="h-4 w-4 mr-2" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="h-4 w-4 mr-2" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-4 w-4 mr-2" /> }] : []),
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-calendar", label: "Schedule Calendar", icon: <Calendar className="h-4 w-4 mr-2" /> },
        { to: "/medical-records", label: "Patient Records", icon: <Heart className="h-4 w-4 mr-2" /> },
        { to: "/prescriptions", label: "Write Prescriptions", icon: <Pill className="h-4 w-4 mr-2" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="h-4 w-4 mr-2" /> },
        { to: "/wallet", label: "Earnings", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/emergency", label: "Emergency Protocols", icon: <AlertTriangle className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Professional Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];
    }

    // Pharmacy / Pharmacist
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-management", label: "Pharmacy Management", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Pharmacy Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/hospital-management", label: "Hospital Management", icon: <Building2 className="h-4 w-4 mr-2" /> },
        { to: "/pharmacy-management", label: "Pharmacy Management", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
        { to: "/lab-management", label: "Lab Management", icon: <Activity className="h-4 w-4 mr-2" /> },
        { to: "/wallet", label: "Admin Wallet", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/role-management", label: "Role Management", icon: <Shield className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];
    }

    // Institution Admin/Staff
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/hospital-management", label: "Facility Management", icon: <Building2 className="h-4 w-4 mr-2" /> },
        { to: "/institution/personnel", label: "Staff", icon: <Users className="h-4 w-4 mr-2" /> },
        { to: "/institution/reports", label: "Reports", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/institution/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
      ];
    }

    // Lab / Lab Technician
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/wallet", label: "Revenue", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/connections", label: "Patients", icon: <Users className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];
    }

    // Default: Patient
    return [
      { to: "/appointments", label: "My Appointments", icon: <Calendar className="h-4 w-4 mr-2" /> },
      { to: "/emergency", label: "Emergency Help", icon: <AlertTriangle className="h-4 w-4 mr-2" /> },
      { to: "/marketplace", label: "Buy Medicine", icon: <Pill className="h-4 w-4 mr-2" /> },
      { to: "/prescriptions", label: "Prescriptions", icon: <Heart className="h-4 w-4 mr-2" /> },
      { to: "/connections", label: "My Providers", icon: <Users className="h-4 w-4 mr-2" /> },
      { to: "/wallet", label: "Wallet", icon: <Wallet className="h-4 w-4 mr-2" /> },
      { to: "/medical-records", label: "Medical Records", icon: <Heart className="h-4 w-4 mr-2" /> },
      { to: "/symptoms", label: "Health Tracking", icon: <Heart className="h-4 w-4 mr-2" /> },
      { to: "/profile", label: "My Profile", icon: <User className="h-4 w-4 mr-2" /> },
      { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
    ];
  }, [isHealthPersonnel, isAdmin, availableRoles]);

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

            {isAuthenticated && <DesktopNavMenu secondaryNavItems={secondaryNavItems} />}
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
