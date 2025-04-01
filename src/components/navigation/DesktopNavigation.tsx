
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export const DesktopNavigation = () => {
  const { isAuthenticated, user } = useAuth();

  return (
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
  );
};
