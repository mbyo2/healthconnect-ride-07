
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, Search, Calendar, MessageSquare, Settings, BookOpen, CheckSquare, Heart, Wallet } from "lucide-react";

export const DesktopNavigation = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const navItems = [
    {
      to: "/",
      label: "Home",
      icon: <Home className="h-5 w-5 mr-2" />,
    },
    {
      to: "/search",
      label: "Find Providers",
      icon: <Search className="h-5 w-5 mr-2" />,
    },
    {
      to: "/appointments",
      label: "Appointments",
      icon: <Calendar className="h-5 w-5 mr-2" />,
      requireAuth: true,
    },
    {
      to: "/symptoms",
      label: "Health Tracker",
      icon: <Heart className="h-5 w-5 mr-2" />,
      requireAuth: true,
    },
    {
      to: "/chat",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5 mr-2" />,
      requireAuth: true,
    },
    {
      to: "/wallet",
      label: "Wallet",
      icon: <Wallet className="h-5 w-5 mr-2" />,
      requireAuth: true,
    },
    {
      to: "/documentation",
      label: "Documentation",
      icon: <BookOpen className="h-5 w-5 mr-2" />,
    },
    {
      to: "/testing",
      label: "Testing",
      icon: <CheckSquare className="h-5 w-5 mr-2" />,
      requireAuth: true,
    },
    {
      to: "/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5 mr-2" />,
      requireAuth: true,
    }
  ];

  return (
    <div className="hidden md:flex items-center space-x-4">
      {navItems.map((item, index) => {
        // Skip auth-required items if not authenticated
        if (item.requireAuth && !isAuthenticated) {
          return null;
        }
        
        return (
          <Button 
            key={index} 
            variant={location.pathname === item.to ? "default" : "ghost"} 
            asChild
            className="flex items-center"
          >
            <Link to={item.to}>
              {item.icon}
              {item.label}
            </Link>
          </Button>
        );
      })}

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
    </div>
  );
};
