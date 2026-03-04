
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useMemo } from "react";
import { 
  Home, Search, Calendar, MessageSquare, Settings, Heart, Wallet,
  Stethoscope, Package, Pill, Shield, Building2, Activity, Brain,
  Users, ShoppingCart, AlertTriangle, User
} from "lucide-react";

export const DesktopNavigation = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { availableRoles, isHealthPersonnel, isAdmin, isPatient } = useUserRoles();

  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { to: "/", label: "Home", icon: <Home className="h-5 w-5 mr-2" /> },
        { to: "/search", label: "Find Providers", icon: <Search className="h-5 w-5 mr-2" /> },
      ];
    }

    // Solo Nurse Consultant
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Visits", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Care Plans", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/medications", label: "Medications", icon: <Pill className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Earnings", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Health Personnel / Doctor / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Patient Records", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/prescriptions", label: "Prescriptions", icon: <Pill className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/ai-diagnostics", label: "AI Assistant", icon: <Brain className="h-5 w-5 mr-2" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Earnings", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Pharmacy / Pharmacist
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-portal", label: "Portal", icon: <Package className="h-5 w-5 mr-2" /> },
        { to: "/pharmacy-inventory", label: "Inventory", icon: <Pill className="h-5 w-5 mr-2" /> },
        { to: "/prescriptions", label: "Prescriptions", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/marketplace", label: "Marketplace", icon: <ShoppingCart className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/admin-dashboard", label: "Dashboard", icon: <Shield className="h-5 w-5 mr-2" /> },
        { to: "/healthcare-application", label: "Applications", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/hospital-management", label: "Hospitals", icon: <Building2 className="h-5 w-5 mr-2" /> },
        { to: "/pharmacy-management", label: "Pharmacies", icon: <ShoppingCart className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Institution Admin/Staff (Hospital)
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/hospital-management", label: "HMS", icon: <Building2 className="h-5 w-5 mr-2" /> },
        { to: "/institution/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/institution/patients", label: "Patients", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/institution/personnel", label: "Staff", icon: <User className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Lab / Lab Technician
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/lab-management", label: "Lab", icon: <Activity className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Records", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Default: Patient
    return [
      { to: "/home", label: "Home", icon: <Home className="h-5 w-5 mr-2" /> },
      { to: "/search", label: "Find Providers", icon: <Search className="h-5 w-5 mr-2" /> },
      { to: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5 mr-2" /> },
      { to: "/symptoms", label: "Health Tracker", icon: <Heart className="h-5 w-5 mr-2" /> },
      { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
      { to: "/marketplace", label: "Buy Medicine", icon: <Pill className="h-5 w-5 mr-2" /> },
      { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
    ];
  }, [isAuthenticated, isHealthPersonnel, isAdmin, isPatient, availableRoles]);

  return (
    <div className="hidden md:flex items-center space-x-2">
      {navItems.map((item, index) => (
        <Button 
          key={index} 
          variant={location.pathname === item.to ? "default" : "ghost"} 
          asChild
          size="sm"
          className="flex items-center"
        >
          <Link to={item.to}>
            {item.icon}
            {item.label}
          </Link>
        </Button>
      ))}
    </div>
  );
};
