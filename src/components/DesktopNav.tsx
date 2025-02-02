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
  Heart,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar";

export const DesktopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

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
    { path: "/home", icon: Home, label: "Home" },
    { path: "/healthcare", icon: Heart, label: "Healthcare" },
    { path: "/search", icon: Search, label: "Find Care" },
    { path: "/map", icon: MapPin, label: "Map" },
    { path: "/appointments", icon: Calendar, label: "Appointments" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const providerLinks = [
    { path: "/home", icon: Home, label: "Dashboard" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/appointments", icon: ClipboardList, label: "Appointments" },
    { path: "/patients", icon: Stethoscope, label: "My Patients" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const links = userRole === 'health_personnel' ? providerLinks : patientLinks;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Dokotela</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((link) => (
                <SidebarMenuItem key={link.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(link.path)}
                    tooltip={link.label}
                  >
                    <Link to={link.path}>
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};