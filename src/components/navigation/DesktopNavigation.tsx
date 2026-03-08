
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { useMemo } from "react";
import { 
  Home, Search, Calendar, MessageSquare, Settings, Heart, Wallet,
  Stethoscope, Package, Pill, Shield, Building2, Activity, Brain,
  Users, ShoppingCart, AlertTriangle, User, Scissors, Droplets,
  DollarSign, Wrench, Truck, Microscope, BarChart3, ClipboardList,
  Navigation, Headphones
} from "lucide-react";

export const DesktopNavigation = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { availableRoles, isHealthPersonnel, isAdmin, isPatient } = useUserRoles();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

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
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-5 w-5 mr-2" /> }] : []),
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
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-5 w-5 mr-2" /> }] : []),
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
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Revenue", icon: <Wallet className="h-5 w-5 mr-2" /> }] : []),
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

    // CXO / Executive
    if (availableRoles.includes('cxo')) {
      return [
        { to: "/institution-dashboard", label: "Executive", icon: <BarChart3 className="h-5 w-5 mr-2" /> },
        { to: "/institution/reports", label: "MIS Reports", icon: <Activity className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Finance", icon: <DollarSign className="h-5 w-5 mr-2" /> },
        { to: "/hospital-management", label: "Operations", icon: <Building2 className="h-5 w-5 mr-2" /> },
        { to: "/compliance-audit", label: "Compliance", icon: <Shield className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Receptionist
    if (availableRoles.includes('receptionist')) {
      return [
        { to: "/institution-dashboard", label: "Front Desk", icon: <ClipboardList className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/institution/patients", label: "Check-In", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/search", label: "Lookup", icon: <Search className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // HR Manager
    if (availableRoles.includes('hr_manager')) {
      return [
        { to: "/institution-dashboard", label: "HR Dashboard", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/institution/personnel", label: "Staff", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/institution/reports", label: "Attendance", icon: <ClipboardList className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Payroll", icon: <DollarSign className="h-5 w-5 mr-2" /> },
        { to: "/institution/settings", label: "Leave Mgmt", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // OT Staff
    if (availableRoles.includes('ot_staff')) {
      return [
        { to: "/institution-dashboard", label: "OT Dashboard", icon: <Scissors className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Surgery Schedule", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Records", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Team Chat", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Triage Staff
    if (availableRoles.includes('triage_staff')) {
      return [
        { to: "/institution-dashboard", label: "Triage", icon: <AlertTriangle className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Queue", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Vitals", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Billing Staff
    if (availableRoles.includes('billing_staff')) {
      return [
        { to: "/institution-dashboard", label: "Billing", icon: <DollarSign className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Invoices", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/institution/reports", label: "Reports", icon: <BarChart3 className="h-5 w-5 mr-2" /> },
        { to: "/prescriptions", label: "Insurance", icon: <Shield className="h-5 w-5 mr-2" /> },
        { to: "/institution/patients", label: "Accounts", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Inventory Manager
    if (availableRoles.includes('inventory_manager')) {
      return [
        { to: "/institution-dashboard", label: "Inventory", icon: <Package className="h-5 w-5 mr-2" /> },
        { to: "/pharmacy-inventory", label: "Stock", icon: <Pill className="h-5 w-5 mr-2" /> },
        { to: "/medications", label: "Supplies", icon: <ClipboardList className="h-5 w-5 mr-2" /> },
        { to: "/institution/reports", label: "Reports", icon: <BarChart3 className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Maintenance Manager
    if (availableRoles.includes('maintenance_manager')) {
      return [
        { to: "/institution-dashboard", label: "Maintenance", icon: <Wrench className="h-5 w-5 mr-2" /> },
        { to: "/institution/devices", label: "Assets", icon: <Settings className="h-5 w-5 mr-2" /> },
        { to: "/institution/reports", label: "Work Orders", icon: <ClipboardList className="h-5 w-5 mr-2" /> },
        { to: "/institution/settings", label: "Contracts", icon: <Building2 className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Ambulance Staff
    if (availableRoles.includes('ambulance_staff')) {
      return [
        { to: "/institution-dashboard", label: "Dispatch", icon: <Truck className="h-5 w-5 mr-2" /> },
        { to: "/emergency", label: "Emergency", icon: <AlertTriangle className="h-5 w-5 mr-2" /> },
        { to: "/map", label: "Navigate", icon: <Navigation className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Transport Log", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Radio", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Phlebotomist
    if (availableRoles.includes('phlebotomist')) {
      return [
        { to: "/lab-management", label: "Samples", icon: <Droplets className="h-5 w-5 mr-2" /> },
        { to: "/map", label: "Home Collections", icon: <Navigation className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Status", icon: <ClipboardList className="h-5 w-5 mr-2" /> },
        { to: "/connections", label: "Patients", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Pathologist
    if (availableRoles.includes('pathologist')) {
      return [
        { to: "/lab-management", label: "Lab", icon: <Microscope className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Reports", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/ai-diagnostics", label: "AI Pathology", icon: <Brain className="h-5 w-5 mr-2" /> },
        { to: "/connections", label: "Doctors", icon: <Users className="h-5 w-5 mr-2" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="h-5 w-5 mr-2" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];
    }

    // Specialist (Dialysis/IVF)
    if (availableRoles.includes('specialist')) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-5 w-5 mr-2" /> },
        { to: "/appointments", label: "Sessions", icon: <Calendar className="h-5 w-5 mr-2" /> },
        { to: "/medical-records", label: "Records", icon: <Heart className="h-5 w-5 mr-2" /> },
        { to: "/prescriptions", label: "Prescriptions", icon: <Pill className="h-5 w-5 mr-2" /> },
        { to: "/ai-diagnostics", label: "AI Assistant", icon: <Brain className="h-5 w-5 mr-2" /> },
        { to: "/chat", label: "Messages", icon: <MessageSquare className="h-5 w-5 mr-2" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-5 w-5 mr-2" /> }] : []),
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
  }, [isAuthenticated, isHealthPersonnel, isAdmin, isPatient, availableRoles, isInstitutionAffiliated]);

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
