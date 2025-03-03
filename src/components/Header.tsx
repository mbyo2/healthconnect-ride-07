
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeIn">
            Dokotela
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Button variant="ghost" asChild>
              <Link to="/">
                Home
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/search">
                Find Providers
              </Link>
            </Button>
            {isAuthenticated && (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/appointments">
                    Appointments
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/chat">
                    Messages
                  </Link>
                </Button>
                {user?.role === "health_personnel" && (
                  <Button variant="ghost" asChild>
                    <Link to="/provider-dashboard">
                      Provider Dashboard
                    </Link>
                  </Button>
                )}
                {user?.role === "admin" && (
                  <Button variant="ghost" asChild>
                    <Link to="/admin-dashboard">
                      Admin Dashboard
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
          
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
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background/80 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top duration-300 md:hidden">
          <nav className="container mx-auto px-4 py-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
              onClick={() => {
                navigate("/");
                setIsMenuOpen(false);
              }}
            >
              Home
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
              onClick={() => {
                navigate("/search");
                setIsMenuOpen(false);
              }}
            >
              Find Care
            </Button>
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
                  onClick={() => {
                    navigate("/profile");
                    setIsMenuOpen(false);
                  }}
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
                  onClick={() => {
                    navigate("/appointments");
                    setIsMenuOpen(false);
                  }}
                >
                  Appointments
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors animate-fadeIn"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
                  onClick={() => {
                    navigate("/auth");
                    setIsMenuOpen(false);
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground hover:text-primary hover:bg-accent transition-colors animate-fadeIn"
                  onClick={() => {
                    navigate("/auth?tab=signup");
                    setIsMenuOpen(false);
                  }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
