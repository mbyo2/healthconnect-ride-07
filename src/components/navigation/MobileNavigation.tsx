
import { Button } from "@/components/ui/button";
import { NavigateFunction } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useMemo } from "react";
import {
  Home, Search, Calendar, MessageSquare, Settings, Building2, User,
  Stethoscope, Shield, Heart, Pill, Package, Activity, Users,
  ShoppingCart, AlertTriangle, Brain, Wallet
} from "lucide-react";

interface MobileNavigationProps {
  setIsMenuOpen: (isOpen: boolean) => void;
  navigate: NavigateFunction;
}

export const MobileNavigation = ({ setIsMenuOpen, navigate }: MobileNavigationProps) => {
  const { isAuthenticated, user, signOut, profile } = useAuth();
  const { currentRole, availableRoles, isHealthPersonnel, isAdmin } = useUserRoles();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  const userDisplayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`
    : user?.email?.split('@')[0] || 'User';

  // Role label for display
  const roleLabel = useMemo(() => {
    if (availableRoles.includes('doctor')) return 'Doctor';
    if (availableRoles.includes('nurse')) return 'Nurse';
    if (availableRoles.includes('radiologist')) return 'Radiologist';
    if (availableRoles.includes('health_personnel')) return 'Healthcare Provider';
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) return 'Pharmacy';
    if (isAdmin) return 'Admin';
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) return 'Institution';
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) return 'Lab';
    return 'Patient';
  }, [availableRoles, isAdmin]);

  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { to: "/", label: "Home", icon: <Home className="mr-2 h-5 w-5" /> },
        { to: "/search", label: "Find Care", icon: <Search className="mr-2 h-5 w-5" /> },
      ];
    }

    // Nurse (solo)
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="mr-2 h-5 w-5" /> },
        { to: "/appointments", label: "Patient Visits", icon: <Calendar className="mr-2 h-5 w-5" /> },
        { to: "/medical-records", label: "Care Plans", icon: <Heart className="mr-2 h-5 w-5" /> },
        { to: "/medications", label: "Medications", icon: <Pill className="mr-2 h-5 w-5" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Earnings", icon: <Wallet className="mr-2 h-5 w-5" /> },
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="mr-2 h-5 w-5" /> },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="mr-2 h-5 w-5" /> },
        { to: "/appointments", label: "Appointments", icon: <Calendar className="mr-2 h-5 w-5" /> },
        { to: "/medical-records", label: "Patient Records", icon: <Heart className="mr-2 h-5 w-5" /> },
        { to: "/prescriptions", label: "Prescriptions", icon: <Pill className="mr-2 h-5 w-5" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
        { to: "/ai-diagnostics", label: "AI Assistant", icon: <Brain className="mr-2 h-5 w-5" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Earnings", icon: <Wallet className="mr-2 h-5 w-5" /> },
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="mr-2 h-5 w-5" /> },
      ];
    }

    // Pharmacy / Pharmacist
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-portal", label: "Portal", icon: <Package className="mr-2 h-5 w-5" /> },
        { to: "/pharmacy-inventory", label: "Inventory", icon: <Pill className="mr-2 h-5 w-5" /> },
        { to: "/prescriptions", label: "Prescriptions", icon: <Heart className="mr-2 h-5 w-5" /> },
        { to: "/marketplace", label: "Marketplace", icon: <ShoppingCart className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="mr-2 h-5 w-5" /> },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/admin-dashboard", label: "Dashboard", icon: <Shield className="mr-2 h-5 w-5" /> },
        { to: "/healthcare-application", label: "Applications", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/hospital-management", label: "Hospitals", icon: <Building2 className="mr-2 h-5 w-5" /> },
        { to: "/pharmacy-management", label: "Pharmacies", icon: <ShoppingCart className="mr-2 h-5 w-5" /> },
        { to: "/lab-management", label: "Labs", icon: <Activity className="mr-2 h-5 w-5" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="mr-2 h-5 w-5" /> },
      ];
    }

    // Institution Admin/Staff
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/institution-dashboard", label: "Dashboard", icon: <Building2 className="mr-2 h-5 w-5" /> },
        { to: "/institution/appointments", label: "Appointments", icon: <Calendar className="mr-2 h-5 w-5" /> },
        { to: "/institution/patients", label: "Patients", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/institution/personnel", label: "Staff", icon: <User className="mr-2 h-5 w-5" /> },
        { to: "/hospital-management", label: "Facility", icon: <Building2 className="mr-2 h-5 w-5" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="mr-2 h-5 w-5" /> },
      ];
    }

    // Lab / Lab Technician
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/lab-management", label: "Lab Dashboard", icon: <Activity className="mr-2 h-5 w-5" /> },
        { to: "/medical-records", label: "Records", icon: <Heart className="mr-2 h-5 w-5" /> },
        { to: "/connections", label: "Patients", icon: <Users className="mr-2 h-5 w-5" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="mr-2 h-5 w-5" /> },
      ];
    }

    // Default: Patient
    return [
      { to: "/home", label: "Home", icon: <Home className="mr-2 h-5 w-5" /> },
      { to: "/search", label: "Find Care", icon: <Search className="mr-2 h-5 w-5" /> },
      { to: "/appointments", label: "Appointments", icon: <Calendar className="mr-2 h-5 w-5" /> },
      { to: "/symptoms", label: "Health Tracking", icon: <Heart className="mr-2 h-5 w-5" /> },
      { to: "/chat", label: "Messages", icon: <MessageSquare className="mr-2 h-5 w-5" /> },
      { to: "/marketplace", label: "Buy Medicine", icon: <Pill className="mr-2 h-5 w-5" /> },
      { to: "/prescriptions", label: "Prescriptions", icon: <Heart className="mr-2 h-5 w-5" /> },
      { to: "/connections", label: "My Providers", icon: <Users className="mr-2 h-5 w-5" /> },
      { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="mr-2 h-5 w-5" /> },
      { to: "/medical-records", label: "Medical Records", icon: <Heart className="mr-2 h-5 w-5" /> },
    ];
  }, [isAuthenticated, isHealthPersonnel, isAdmin, availableRoles]);

  return (
    <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top duration-300 md:hidden z-50">
      <nav className="container mx-auto px-4 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {isAuthenticated && (
          <div className="border-b pb-3 mb-2">
            <div className="font-medium text-foreground">
              Welcome, {userDisplayName}
            </div>
            <div className="text-sm text-muted-foreground">
              {roleLabel}
            </div>
          </div>
        )}

        {navItems.map((item) => (
          <Button
            key={item.to}
            variant="ghost"
            className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
            onClick={() => navigateTo(item.to)}
          >
            {item.icon}
            {item.label}
          </Button>
        ))}

        {isAuthenticated && (
          <div className="border-t pt-3 mt-3 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/profile")}
            >
              <User className="mr-2 h-5 w-5" />
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/settings")}
            >
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        )}

        {!isAuthenticated && (
          <div className="border-t pt-3 mt-3 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/auth")}
            >
              Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/auth?tab=signup")}
            >
              Sign Up
            </Button>
          </div>
        )}
      </nav>
    </div>
  );
};
