import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "./ThemeToggle";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/login");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-fadeIn">
            Dokotela
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden h-10 w-10 hover:bg-accent transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background/80 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top duration-300">
          <nav className="container mx-auto px-4 py-2 space-y-1">
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
          </nav>
        </div>
      )}
    </header>
  );
};