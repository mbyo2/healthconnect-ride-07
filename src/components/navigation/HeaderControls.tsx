
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
  const { currentRole } = useUserRoles();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const getProfileDashboardLink = () => {
    if (currentRole === 'health_personnel') return '/provider-dashboard';
    if (currentRole === 'admin') return '/admin-dashboard';
    if (currentRole === 'institution_admin') return '/institution-dashboard';
    return '/profile'; // Default for patients or unknown roles
  };

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
              <DropdownMenuItem onClick={() => navigate(getProfileDashboardLink())}>
                My Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/appointments')}>
                My Appointments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile-setup')}>
                Profile Settings
              </DropdownMenuItem>
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
