
import { Button } from "@/components/ui/button";
import { NavigateFunction } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface MobileNavigationProps {
  setIsMenuOpen: (isOpen: boolean) => void;
  navigate: NavigateFunction;
}

export const MobileNavigation = ({ setIsMenuOpen, navigate }: MobileNavigationProps) => {
  const { isAuthenticated, user, signOut } = useAuth();

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

  return (
    <div className="absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top duration-300 md:hidden z-50">
      <nav className="container mx-auto px-4 py-3 space-y-2 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
          onClick={() => navigateTo("/")}
        >
          Home
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
          onClick={() => navigateTo("/search")}
        >
          Find Care
        </Button>
        {isAuthenticated ? (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/profile")}
            >
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/appointments")}
            >
              Appointments
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
              onClick={() => navigateTo("/chat")}
            >
              Messages
            </Button>
            {user?.role === "health_personnel" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
                onClick={() => navigateTo("/provider-dashboard")}
              >
                Provider Dashboard
              </Button>
            )}
            {user?.role === "admin" && (
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:text-primary hover:bg-accent/50 transition-colors"
                onClick={() => navigateTo("/admin-dashboard")}
              >
                Admin Dashboard
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
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
