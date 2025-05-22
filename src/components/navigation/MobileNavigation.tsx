
import { Button } from "@/components/ui/button";
import { NavigateFunction } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { Home, Search, Calendar, MessageSquare, Settings, Building2, User, Stethoscope, ShieldCheck } from "lucide-react";

interface MobileNavigationProps {
  setIsMenuOpen: (isOpen: boolean) => void;
  navigate: NavigateFunction;
}

export const MobileNavigation = ({ setIsMenuOpen, navigate }: MobileNavigationProps) => {
  const { isAuthenticated, user, signOut, profile } = useAuth();
  const { currentRole, availableRoles } = useUserRoles();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navigateTo = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  // Get user display name
  const userDisplayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ''}`
    : user?.email?.split('@')[0] || 'User';

  return (
    <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top duration-300 md:hidden z-50">
      <nav className="container mx-auto px-4 py-3 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {isAuthenticated && (
          <div className="border-b pb-3 mb-2">
            <div className="font-medium">
              Welcome, {userDisplayName}
            </div>
            <div className="text-sm text-muted-foreground">
              Current role: {currentRole || 'Patient'}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
          onClick={() => navigateTo("/")}
        >
          <Home className="mr-2 h-5 w-5" />
          Home
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
          onClick={() => navigateTo("/search")}
        >
          <Search className="mr-2 h-5 w-5" />
          Find Care
        </Button>
        
        {isAuthenticated ? (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/profile-setup")}
            >
              <User className="mr-2 h-5 w-5" />
              Profile
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/appointments")}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Appointments
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/chat")}
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Messages
            </Button>

            {/* Role-specific menu items */}
            {availableRoles.includes('health_personnel') && (
              <Button
                variant={currentRole === 'health_personnel' ? "default" : "ghost"}
                className="w-full justify-start hover:bg-accent/50 transition-colors"
                onClick={() => navigateTo("/provider-dashboard")}
              >
                <Stethoscope className="mr-2 h-5 w-5" />
                Provider Dashboard
              </Button>
            )}
            
            {availableRoles.includes('admin') && (
              <Button
                variant={currentRole === 'admin' ? "default" : "ghost"}
                className="w-full justify-start hover:bg-accent/50 transition-colors"
                onClick={() => navigateTo("/admin-dashboard")}
              >
                <ShieldCheck className="mr-2 h-5 w-5" />
                Admin Dashboard
              </Button>
            )}
            
            {availableRoles.includes('institution_admin') && (
              <Button
                variant={currentRole === 'institution_admin' ? "default" : "ghost"}
                className="w-full justify-start hover:bg-accent/50 transition-colors"
                onClick={() => navigateTo("/institution-dashboard")}
              >
                <Building2 className="mr-2 h-5 w-5" />
                Institution Dashboard
              </Button>
            )}

            <div className="border-t pt-3 mt-3">
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
          </>
        ) : (
          <>
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
          </>
        )}
      </nav>
    </div>
  );
};
