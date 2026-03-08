
import { Home, Search, Calendar, MessageSquare, Heart, Users, ShoppingCart, Pill, AlertTriangle, User, Wallet, Brain, Shield, Activity, Settings, Building2, Stethoscope, Package, Headphones, Scissors, Droplets, DollarSign, Wrench, Truck, Microscope, BarChart3, ClipboardList, Navigation } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useDeviceType } from "@/hooks/use-device-type";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { hasRoutePermission } from "@/utils/rolePermissions";
import { useMemo } from "react";
import { BottomNavItem } from "@/components/navigation/BottomNavItem";
import { BottomNavMenu } from "@/components/navigation/BottomNavMenu";

export function BottomNav() {
  const location = useLocation();
  const { isDesktop } = useDeviceType();
  const { isAuthenticated, user } = useAuth();
  const { availableRoles, isHealthPersonnel, isAdmin } = useUserRoles();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

  const navItems = useMemo(() => {
    // Support role
    if (availableRoles.includes('support')) {
      return [
        { to: "/admin-dashboard", label: "Support", icon: <Headphones className="h-5 w-5" />, active: location.pathname === "/admin-dashboard", description: "Support dashboard" },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Live support chat" },
        { to: "/search", label: "Lookup", icon: <Search className="h-5 w-5" />, active: location.pathname === "/search", description: "User lookup" },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" />, active: location.pathname === "/settings", description: "Settings" },
      ];
    }

    // Solo Nurse
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-5 w-5" />, active: location.pathname === "/provider-dashboard", description: "Nurse dashboard" },
        { to: "/appointments", label: "Visits", icon: <Calendar className="h-5 w-5" />, active: location.pathname === "/appointments", description: "Patient visits & home calls" },
        { to: "/medical-records", label: "Care", icon: <Heart className="h-5 w-5" />, active: location.pathname === "/medical-records", description: "Patient care & vitals" },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Patient & doctor messages" },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Dashboard", icon: <Stethoscope className="h-5 w-5" />, active: location.pathname === "/provider-dashboard", description: "Provider dashboard" },
        { to: "/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5" />, active: location.pathname === "/appointments", description: "Patient appointments" },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Patient messages" },
        { to: "/ai-diagnostics", label: "AI", icon: <Brain className="h-5 w-5" />, active: location.pathname === "/ai-diagnostics", description: "AI clinical assistant" },
      ];
    }

    // Pharmacy
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-portal", label: "Portal", icon: <Package className="h-5 w-5" />, active: location.pathname === "/pharmacy-portal", description: "Pharmacy portal" },
        { to: "/pharmacy-inventory", label: "Inventory", icon: <Pill className="h-5 w-5" />, active: location.pathname === "/pharmacy-inventory", description: "Manage inventory" },
        { to: "/prescriptions", label: "Rx", icon: <Heart className="h-5 w-5" />, active: location.pathname === "/prescriptions", description: "Prescriptions" },
        { to: "/marketplace", label: "Market", icon: <ShoppingCart className="h-5 w-5" />, active: location.pathname === "/marketplace", description: "Marketplace" },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/admin-dashboard", label: "Admin", icon: <Shield className="h-5 w-5" />, active: location.pathname === "/admin-dashboard", description: "Admin dashboard" },
        { to: "/healthcare-application", label: "Apps", icon: <Users className="h-5 w-5" />, active: location.pathname === "/healthcare-application", description: "Applications" },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Messages" },
        { to: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" />, active: location.pathname === "/settings", description: "Settings" },
      ];
    }

    // Institution admin/staff
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/institution-dashboard", label: "Dashboard", icon: <Building2 className="h-5 w-5" />, active: location.pathname === "/institution-dashboard", description: "Institution dashboard" },
        { to: "/institution/appointments", label: "Appointments", icon: <Calendar className="h-5 w-5" />, active: location.pathname === "/institution/appointments", description: "Appointments" },
        { to: "/institution/patients", label: "Patients", icon: <Users className="h-5 w-5" />, active: location.pathname === "/institution/patients", description: "Patients" },
        { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Messages" },
      ];
    }

    // Lab
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/lab-management", label: "Lab", icon: <Activity className="h-5 w-5" />, active: location.pathname === "/lab-management", description: "Lab management" },
        { to: "/medical-records", label: "Records", icon: <Heart className="h-5 w-5" />, active: location.pathname === "/medical-records", description: "Medical records" },
        { to: "/search", label: "Search", icon: <Search className="h-5 w-5" />, active: location.pathname === "/search", description: "Search" },
        { to: "/profile", label: "Profile", icon: <User className="h-5 w-5" />, active: location.pathname === "/profile", description: "Profile" },
      ];
    }

    // Default: Patient
    return [
      { to: "/home", label: "Home", icon: <Home className="h-5 w-5" />, active: location.pathname === "/home" || location.pathname === "/", description: "Dashboard and overview" },
      { to: "/search", label: "Find", icon: <Search className="h-5 w-5" />, active: location.pathname === "/search", description: "Find doctors and clinics" },
      { to: "/symptoms", label: "Symptoms", icon: <Heart className="h-5 w-5" />, active: location.pathname === "/symptoms", description: "Track symptoms and health" },
      { to: "/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" />, active: location.pathname === "/chat", description: "Chat with providers" },
    ];
  }, [location.pathname, isHealthPersonnel, isAdmin, availableRoles]);

  const menuItems = useMemo(() => {
    // Support menu
    if (availableRoles.includes('support')) {
      return [
        { to: "/healthcare-application", label: "Applications", description: "Review provider applications", icon: <Users className="h-5 w-5" /> },
        { to: "/appointments", label: "Appointments", description: "View appointments for support", icon: <Calendar className="h-5 w-5" /> },
        { to: "/medical-records", label: "Patient Records", description: "View patient records", icon: <Heart className="h-5 w-5" /> },
        { to: "/profile", label: "Profile", description: "Support profile", icon: <User className="h-5 w-5" /> },
        { to: "/settings", label: "Settings", description: "Preferences", icon: <Settings className="h-5 w-5" /> },
      ];
    }

    // Solo Nurse
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-calendar", label: "My Schedule", description: "View & manage schedule", icon: <Calendar className="h-5 w-5" /> },
        { to: "/medications", label: "Medication Admin", description: "Track medication rounds", icon: <Pill className="h-5 w-5" /> },
        { to: "/connections", label: "My Patients", description: "Connected patients", icon: <Users className="h-5 w-5" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", description: "Revenue and payouts", icon: <Wallet className="h-5 w-5" /> }] : []),
        { to: "/emergency", label: "Emergency", description: "Emergency protocols", icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
        { to: "/profile", label: "Profile", description: "Nursing credentials", icon: <User className="h-5 w-5" /> },
        { to: "/settings", label: "Settings", description: "Preferences", icon: <Settings className="h-5 w-5" /> },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-calendar", label: "Schedule Calendar", description: "View and manage your schedule", icon: <Calendar className="h-5 w-5" /> },
        { to: "/medical-records", label: "Patient Records", description: "Access patient medical records", icon: <Heart className="h-5 w-5" /> },
        { to: "/prescriptions", label: "Write Prescriptions", description: "Create and manage prescriptions", icon: <Pill className="h-5 w-5" /> },
        { to: "/connections", label: "My Patients", description: "Your connected patients", icon: <Users className="h-5 w-5" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", description: "View your earnings and payouts", icon: <Wallet className="h-5 w-5" /> }] : []),
        { to: "/emergency", label: "Emergency Protocols", description: "Emergency response tools", icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
        { to: "/profile", label: "Professional Profile", description: "Credentials and specializations", icon: <User className="h-5 w-5" /> },
        { to: "/settings", label: "Settings", description: "Practice preferences", icon: <Settings className="h-5 w-5" /> },
      ];
    }

    // Pharmacy
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-management", label: "Pharmacy Management", description: "Manage pharmacy operations", icon: <ShoppingCart className="h-5 w-5" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Revenue", description: "Track sales and revenue", icon: <Wallet className="h-5 w-5" /> }] : []),
        { to: "/profile", label: "Pharmacy Profile", description: "Business information", icon: <User className="h-5 w-5" /> },
        { to: "/settings", label: "Settings", description: "Pharmacy preferences", icon: <Settings className="h-5 w-5" /> },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/hospital-management", label: "Hospital Management", description: "Manage hospital operations", icon: <Activity className="h-5 w-5" /> },
        { to: "/pharmacy-management", label: "Pharmacy Management", description: "Manage pharmacy operations", icon: <ShoppingCart className="h-5 w-5" /> },
        { to: "/lab-management", label: "Lab Management", description: "Manage lab operations", icon: <Activity className="h-5 w-5" /> },
        { to: "/wallet", label: "Admin Wallet", description: "Platform finances", icon: <Wallet className="h-5 w-5" /> },
        { to: "/role-management", label: "Role Management", description: "Manage user roles", icon: <Shield className="h-5 w-5" /> },
        { to: "/profile", label: "Profile", description: "Admin profile", icon: <User className="h-5 w-5" /> },
      ];
    }

    // Institution
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/hospital-management", label: "Facility Management", description: "Manage facility operations", icon: <Building2 className="h-5 w-5" /> },
        { to: "/institution/personnel", label: "Staff", description: "Manage staff", icon: <Users className="h-5 w-5" /> },
        { to: "/institution/reports", label: "Reports", description: "Analytics and reports", icon: <Activity className="h-5 w-5" /> },
        { to: "/wallet", label: "Finances", description: "Institution finances", icon: <Wallet className="h-5 w-5" /> },
        { to: "/institution/settings", label: "Settings", description: "Institution settings", icon: <Settings className="h-5 w-5" /> },
        { to: "/profile", label: "Profile", description: "Institution profile", icon: <User className="h-5 w-5" /> },
      ];
    }

    // Lab
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/connections", label: "Patients", description: "Patient lookup", icon: <Users className="h-5 w-5" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Revenue", description: "Lab revenue", icon: <Wallet className="h-5 w-5" /> }] : []),
        { to: "/settings", label: "Settings", description: "Lab settings", icon: <Settings className="h-5 w-5" /> },
      ];
    }

    // Default: Patient
    return [
      { to: "/appointments", label: "My Appointments", description: "View and manage your appointments", icon: <Calendar className="h-5 w-5" /> },
      { to: "/emergency", label: "Emergency Help", description: "Emergency services and contacts", icon: <AlertTriangle className="h-5 w-5 text-red-600" /> },
      { to: "/marketplace", label: "Buy Medicine", description: "Order medications from pharmacies", icon: <Pill className="h-5 w-5" /> },
      { to: "/prescriptions", label: "Prescriptions", description: "View and manage your medications", icon: <Heart className="h-5 w-5" /> },
      { to: "/connections", label: "My Providers", description: "Your healthcare provider network", icon: <Users className="h-5 w-5" /> },
      { to: "/wallet", label: "Wallet", description: "Manage your payments", icon: <Wallet className="h-5 w-5" /> },
      { to: "/medical-records", label: "Medical Records", description: "View your health records", icon: <Heart className="h-5 w-5" /> },
      { to: "/profile", label: "My Profile", description: "Personal information and settings", icon: <User className="h-5 w-5" /> },
      { to: "/settings", label: "Settings", description: "App settings and preferences", icon: <Settings className="h-5 w-5" /> },
    ];
  }, [isHealthPersonnel, isAdmin, availableRoles, isInstitutionAffiliated]);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => hasRoutePermission(availableRoles, item.to));
  }, [menuItems, availableRoles]);

  if (!isAuthenticated || isDesktop) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      <div className="absolute inset-0 bg-background/95 backdrop-blur-lg border-t border-border" />
      <div className="relative flex items-center justify-evenly h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item, index) => (
          <BottomNavItem key={index} {...item} />
        ))}
        <BottomNavMenu user={user} menuItems={filteredMenuItems} />
      </div>
    </div>
  );
}
