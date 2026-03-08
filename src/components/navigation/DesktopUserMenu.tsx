
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Users, Settings, Heart, Stethoscope, Shield, Building2, Package, Activity, Wallet } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { useUserRoles } from "@/context/UserRolesContext";
import { useInstitutionAffiliation } from "@/hooks/useInstitutionAffiliation";
import { useMemo } from "react";

interface Profile {
  role?: string;
  admin_level?: string;
  avatar_url?: string;
}

interface DesktopUserMenuProps {
  user: SupabaseUser;
  profile: Profile | null;
  onLogout: () => void;
}

export function DesktopUserMenu({ user, profile, onLogout }: DesktopUserMenuProps) {
  const { availableRoles, isHealthPersonnel, isAdmin } = useUserRoles();
  const { isInstitutionAffiliated } = useInstitutionAffiliation();

  const menuItems = useMemo(() => {
    // Nurse (solo)
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Nurse Dashboard", icon: <Stethoscope className="h-4 w-4" /> },
        { to: "/appointments", label: "Patient Visits", icon: <Calendar className="h-4 w-4" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-4 w-4" /> }] : []),
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Doctor / Health Personnel / Radiologist
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) {
      return [
        { to: "/provider-dashboard", label: "Provider Dashboard", icon: <Stethoscope className="h-4 w-4" /> },
        { to: "/appointments", label: "Patient Appointments", icon: <Calendar className="h-4 w-4" /> },
        { to: "/connections", label: "My Patients", icon: <Users className="h-4 w-4" /> },
        ...(!isInstitutionAffiliated ? [{ to: "/wallet", label: "Earnings", icon: <Wallet className="h-4 w-4" /> }] : []),
        { to: "/profile", label: "Professional Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Pharmacy / Pharmacist
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { to: "/pharmacy-portal", label: "Pharmacy Portal", icon: <Package className="h-4 w-4" /> },
        { to: "/wallet", label: "Revenue", icon: <Wallet className="h-4 w-4" /> },
        { to: "/profile", label: "Pharmacy Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Admin
    if (isAdmin) {
      return [
        { to: "/admin-dashboard", label: "Admin Dashboard", icon: <Shield className="h-4 w-4" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="h-4 w-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Institution Admin/Staff
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { to: "/institution-dashboard", label: "Institution Dashboard", icon: <Building2 className="h-4 w-4" /> },
        { to: "/wallet", label: "Finances", icon: <Wallet className="h-4 w-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Lab / Lab Technician
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { to: "/lab-management", label: "Lab Dashboard", icon: <Activity className="h-4 w-4" /> },
        { to: "/profile", label: "Profile", icon: <User className="h-4 w-4" /> },
        { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ];
    }

    // Default: Patient
    return [
      { to: "/profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
      { to: "/appointments", label: "My Appointments", icon: <Calendar className="h-4 w-4" /> },
      { to: "/connections", label: "My Providers", icon: <Users className="h-4 w-4" /> },
      { to: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
    ];
  }, [availableRoles, isHealthPersonnel, isAdmin]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9 ring-2 ring-border hover:ring-primary/40 transition-all">
            <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || ""} alt={user?.email || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[60]">
        <DropdownMenuLabel>
          <div className="text-sm font-medium truncate">{user.email}</div>
          <div className="text-xs text-muted-foreground">My Account</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuItems.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className="flex items-center gap-2">
              {item.icon} {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onLogout(); }}
          className="text-destructive cursor-pointer"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
