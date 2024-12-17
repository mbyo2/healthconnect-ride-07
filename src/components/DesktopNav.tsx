import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Search,
  Calendar,
  User,
  MapPin,
  Stethoscope,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const DesktopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
          console.log("User role:", profile.role);
        }
      }
    };

    fetchUserRole();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/login");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const patientLinks = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Find Care" },
    { path: "/map", icon: MapPin, label: "Map" },
    { path: "/appointments", icon: Calendar, label: "Appointments" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const providerLinks = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/appointments", icon: Calendar, label: "Appointments" },
    { path: "/patients", icon: ClipboardList, label: "My Patients" },
    { path: "/availability", icon: Stethoscope, label: "Availability" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const links = userRole === 'health_personnel' ? providerLinks : patientLinks;

  return (
    <div className="hidden lg:flex flex-col h-screen w-64 bg-white border-r border-gray-200 p-4">
      <div className="flex items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">Dokotela</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive(link.path)
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <link.icon className="h-5 w-5 mr-3" />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5 mr-3" />
        Logout
      </Button>
    </div>
  );
};