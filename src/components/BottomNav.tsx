import { Home, Search, Calendar, User, MapPin, Stethoscope, ClipboardList } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BottomNav = () => {
  const location = useLocation();
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
        }
      }
    };

    fetchUserRole();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const patientNav = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/map", icon: MapPin, label: "Map" },
    { path: "/appointments", icon: Calendar, label: "Bookings" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const providerNav = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/appointments", icon: Calendar, label: "Bookings" },
    { path: "/patients", icon: ClipboardList, label: "Patients" },
    { path: "/availability", icon: Stethoscope, label: "Schedule" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const navItems = userRole === 'health_personnel' ? providerNav : patientNav;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t px-4 py-2 z-50">
      <div className="flex justify-between items-center max-w-xl mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center transition-colors ${
              isActive(item.path)
                ? "text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <item.icon className={`h-6 w-6 transition-transform ${
              isActive(item.path) ? "scale-110" : ""
            }`} />
            <span className={`text-xs mt-1 transition-opacity ${
              isActive(item.path) ? "opacity-100" : "opacity-70"
            }`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};