
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { AccessibilityMenu } from '@/components/AccessibilityMenu';
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { NavigateFunction } from "react-router-dom";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils/string-utils";

interface HeaderControlsProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  navigate: NavigateFunction;
}

export const HeaderControls = ({ isMenuOpen, setIsMenuOpen, navigate }: HeaderControlsProps) => {
  const { isAuthenticated, signOut, profile, user } = useAuth();
  const { availableRoles, isHealthPersonnel, isAdmin } = useUserRoles();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/auth");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  // Role-specific dashboard link
  const dashboardLink = useMemo(() => {
    if (availableRoles.includes('nurse') && !availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) return '/provider-dashboard';
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'radiologist'].includes(r))) return '/provider-dashboard';
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) return '/pharmacy-portal';
    if (isAdmin) return '/admin-dashboard';
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) return '/institution-dashboard';
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) return '/lab-management';
    return '/home';
  }, [availableRoles, isHealthPersonnel, isAdmin]);

  // Role-specific quick items for the dropdown
  const quickItems = useMemo(() => {
    if (isHealthPersonnel || availableRoles.some(r => ['doctor', 'nurse', 'radiologist'].includes(r))) {
      return [
        { label: "My Dashboard", path: "/provider-dashboard" },
        { label: "Patient Appointments", path: "/appointments" },
        { label: "Profile", path: "/profile" },
      ];
    }
    if (availableRoles.some(r => ['pharmacy', 'pharmacist'].includes(r))) {
      return [
        { label: "Pharmacy Portal", path: "/pharmacy-portal" },
        { label: "Inventory", path: "/pharmacy-inventory" },
        { label: "Profile", path: "/profile" },
      ];
    }
    if (isAdmin) {
      return [
        { label: "Admin Dashboard", path: "/admin-dashboard" },
        { label: "Applications", path: "/healthcare-application" },
        { label: "Profile", path: "/profile" },
      ];
    }
    if (availableRoles.some(r => ['institution_admin', 'institution_staff'].includes(r))) {
      return [
        { label: "Institution Dashboard", path: "/institution-dashboard" },
        { label: "Staff", path: "/institution/personnel" },
        { label: "Profile", path: "/profile" },
      ];
    }
    if (availableRoles.some(r => ['lab', 'lab_technician'].includes(r))) {
      return [
        { label: "Lab Dashboard", path: "/lab-management" },
        { label: "Profile", path: "/profile" },
      ];
    }
    // Patient
    return [
      { label: "My Dashboard", path: "/home" },
      { label: "My Appointments", path: "/appointments" },
      { label: "Profile Settings", path: "/profile" },
    ];
  }, [availableRoles, isHealthPersonnel, isAdmin]);

  return (
    <div className="flex items-center gap-2">
      {/* Auth buttons/dropdown for desktop */}
      <div className="hidden md:flex items-center gap-2">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback>
                    {getInitials(`${profile?.first_name || ''} ${profile?.last_name || ''}`)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickItems.map((item) => (
                <DropdownMenuItem key={item.path} onClick={() => navigate(item.path)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth?tab=signup">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
      
      <AccessibilityMenu />
      <VoiceCommandButton />
      <ThemeToggle />
      {isAuthenticated && <NotificationCenter />}
      <Button 
        variant="ghost" 
        size="icon"
        className="md:hidden h-10 w-10 hover:bg-accent transition-colors"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
};
