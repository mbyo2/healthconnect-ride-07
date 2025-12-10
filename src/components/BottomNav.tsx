
import { Home, Search, Calendar, MessageSquare, Heart, Users, ShoppingCart, Pill, AlertTriangle, User, Wallet, Brain, Shield, Activity, BarChart3, Zap, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useDeviceType } from "@/hooks/use-device-type";
import { useAuth } from "@/context/AuthContext";
import { useUserRoles } from "@/context/UserRolesContext";
import { hasRoutePermission } from "@/utils/rolePermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
import { BottomNavItem } from "@/components/navigation/BottomNavItem";
import { BottomNavMenu } from "@/components/navigation/BottomNavMenu";

export function BottomNav() {
  const location = useLocation();
  const supabase = useSupabaseClient();
  const { isDesktop } = useDeviceType();
  const { isAuthenticated, user } = useAuth();
  const { availableRoles } = useUserRoles();

  // Optimized navigation items for mobile
  const navItems = useMemo(() => [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      active: location.pathname === "/",
      description: "Dashboard and overview"
    },
    {
      to: "/search",
      label: "Find",
      icon: <Search className="h-5 w-5" />,
      active: location.pathname === "/search",
      description: "Find doctors and clinics"
    },
    {
      to: "/symptoms",
      label: "Health",
      icon: <Heart className="h-5 w-5" />,
      active: location.pathname === "/symptoms",
      description: "Track symptoms and health"
    },
    {
      to: "/chat",
      label: "Chat",
      icon: <MessageSquare className="h-5 w-5" />,
      active: location.pathname === "/chat",
      description: "Chat with providers"
    }
  ], [location.pathname]);

  // Enhanced menu items for comprehensive access
  const menuItems = useMemo(() => [
    {
      to: "/appointments",
      label: "My Appointments",
      description: "View and manage your appointments",
      icon: <Calendar className="h-5 w-5" />
    },
    {
      to: "/emergency",
      label: "Emergency Help",
      description: "Emergency services and contacts",
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />
    },
    {
      to: "/marketplace",
      label: "Buy Medicine",
      description: "Order medications from pharmacies",
      icon: <Pill className="h-5 w-5" />
    },
    {
      to: "/prescriptions",
      label: "Prescriptions",
      description: "View and manage your medications",
      icon: <Heart className="h-5 w-5" />
    },
    {
      to: "/connections",
      label: "My Providers",
      description: "Your healthcare provider network",
      icon: <Users className="h-5 w-5" />
    },
    {
      to: "/marketplace-users",
      label: "Find Providers",
      description: "Browse healthcare marketplace",
      icon: <Users className="h-5 w-5" />
    },
    {
      to: "/pharmacy-portal",
      label: "Pharmacy Portal",
      description: "Manage pharmacy (for admins)",
      icon: <ShoppingCart className="h-5 w-5" />
    },
    {
      to: "/profile",
      label: "My Profile",
      description: "Personal information and settings",
      icon: <User className="h-5 w-5" />
    },
    // Advanced Healthcare Features
    {
      to: "/ai-diagnostics",
      label: "AI Diagnostic Assistant",
      description: "AI-powered symptom analysis and diagnosis",
      icon: <Brain className="h-5 w-5 text-purple-600" />
    },
    {
      to: "/blockchain-records",
      label: "Blockchain Medical Records",
      description: "Secure, decentralized medical data",
      icon: <Shield className="h-5 w-5 text-green-600" />
    },
    {
      to: "/iot-monitoring",
      label: "IoT Health Monitoring",
      description: "Real-time device health tracking",
      icon: <Activity className="h-5 w-5 text-red-600" />
    },
    {
      to: "/health-analytics",
      label: "Health Data Analytics",
      description: "Advanced health analytics and charts",
      icon: <BarChart3 className="h-5 w-5 text-indigo-600" />
    },
    // Management Systems
    {
      to: "/pharmacy-management",
      label: "Pharmacy Management",
      description: "Manage pharmacy operations",
      icon: <ShoppingCart className="h-5 w-5" />
    },
    {
      to: "/hospital-management",
      label: "Hospital Management",
      description: "Manage hospital operations",
      icon: <Activity className="h-5 w-5" />
    },
    {
      to: "/lab-management",
      label: "Lab Management",
      description: "Manage lab tests and results",
      icon: <Activity className="h-5 w-5" />
    },
    {
      to: "/settings",
      label: "Settings",
      description: "App settings and preferences",
      icon: <Settings className="h-5 w-5" />
    }
  ], []);

  // Filter menu items based on user permissions
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => hasRoutePermission(availableRoles, item.to));
  }, [menuItems, availableRoles]);

  // Don't render if not authenticated or on desktop - AFTER all hooks
  if (!isAuthenticated || isDesktop) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
      {/* Enhanced backdrop with better contrast */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl border-t-2 border-trust-200 shadow-2xl" />

      {/* Navigation content optimized for mobile */}
      <div className="relative flex items-center justify-evenly h-20 px-2">
        {navItems.map((item, index) => (
          <BottomNavItem key={index} {...item} />
        ))}
        <BottomNavMenu user={user} menuItems={filteredMenuItems} />
      </div>
    </div>
  );
}
