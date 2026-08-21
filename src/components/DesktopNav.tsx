import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useMemo } from "react";
import { useSearch } from "@/context/SearchContext";
import {
  Home, Calendar, MessageSquare, Users, ShoppingCart, Heart, Settings, User, Brain,
  Shield, Activity, BarChart3, AlertTriangle, Zap, Package, Pill, Stethoscope,
  Building2, Wallet, ShieldCheck, Calculator, Bell, Clock
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
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-4 w-4 mr-2" /> }] : []),
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
      const adminItems = [
        { to: "/hospital-management", label: "Hospital Management", icon: <Building2 className="h-4 w-4 mr-2" /> },
        { to: "/pharmacy-management", label: "Pharmacy Management", icon: <ShoppingCart className="h-4 w-4 mr-2" /> },
        { to: "/lab-management", label: "Lab Management", icon: <Activity className="h-4 w-4 mr-2" /> },
        { to: "/wallet", label: "Admin Wallet", icon: <Wallet className="h-4 w-4 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4 mr-2" /> },
      ];

      return availableRoles.includes('super_admin')
        ? [...adminItems, { to: "/role-management", label: "Role Management", icon: <Shield className="h-4 w-4 mr-2" /> }]
        : adminItems;
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
      { to: "/insurance-cards", label: "Insurance Cards", icon: <ShieldCheck className="h-4 w-4 mr-2" /> },
      { to: "/cost-estimator", label: "Cost Estimator", icon: <Calculator className="h-4 w-4 mr-2" /> },
      { to: "/waitlist", label: "My Waitlists", icon: <Bell className="h-4 w-4 mr-2" /> },
      { to: "/appointment-reminders", label: "Reminders & Sync", icon: <Clock className="h-4 w-4 mr-2" /> },
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
  }, [isHealthPersonnel, isAdmin, availableRoles, isInstitutionAffiliated]);

  return (
    <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm" role="banner">
      <div className="mx-auto flex items-center justify-between h-20 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 max-w-[1600px]">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-10 lg:gap-12">
          <AppLogo size="sm" className="shrink-0" />

          <nav className="hidden lg:flex items-center gap-2" role="navigation" aria-label="Main navigation">
            {mainNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  item.active
                    ? "bg-primary text-primary-foreground shadow-button"
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
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block" role="search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search doctors, specialties..."
              className="w-[220px] lg:w-[300px] xl:w-[360px] 2xl:w-[420px] pl-11 h-12 rounded-full bg-muted/50 border-2 border-transparent focus:bg-background focus:border-primary transition-all duration-300"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </form>

          <CurrencyToggle />
          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}

          {isAuthenticated && user ? (
            <DesktopUserMenu user={user} profile={profile} onLogout={handleLogout} />
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex h-12 px-6 text-base font-medium">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="h-12 px-6 text-base font-medium">
                <Link to="/auth?tab=signup">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
