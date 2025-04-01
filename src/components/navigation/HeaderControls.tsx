
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/NotificationCenter";
import { VoiceCommandButton } from '@/components/VoiceCommandButton';
import { AccessibilityMenu } from '@/components/AccessibilityMenu';
import { useAuth } from "@/context/AuthContext";
import { NavigateFunction } from "react-router-dom";

interface HeaderControlsProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  navigate: NavigateFunction;
}

export const HeaderControls = ({ isMenuOpen, setIsMenuOpen, navigate }: HeaderControlsProps) => {
  const { isAuthenticated, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Auth buttons for desktop */}
      <div className="hidden md:flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">Profile</Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </>
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
