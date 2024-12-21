import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { NotificationCenter } from "./NotificationCenter";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="px-4">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dokotela
          </h1>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 hover:bg-gray-100" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white/80 backdrop-blur-md border-b shadow-lg animate-in slide-in-from-top">
          <nav className="max-w-xl mx-auto px-4 py-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary hover:bg-gray-50"
              onClick={() => {
                navigate("/search");
                setIsMenuOpen(false);
              }}
            >
              Find Care
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary hover:bg-gray-50"
              onClick={() => {
                navigate("/profile");
                setIsMenuOpen(false);
              }}
            >
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary hover:bg-gray-50"
              onClick={() => {
                navigate("/appointments");
                setIsMenuOpen(false);
              }}
            >
              Appointments
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
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