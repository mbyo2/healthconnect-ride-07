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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="text-xl font-bold text-primary">Dokotela</h1>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b shadow-lg">
          <nav className="px-4 py-2 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary"
              onClick={() => navigate("/search")}
            >
              Find Care
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary"
              onClick={() => navigate("/profile")}
            >
              Profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-primary"
              onClick={() => navigate("/appointments")}
            >
              Appointments
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};