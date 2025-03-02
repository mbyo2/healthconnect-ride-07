import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { Link, useLocation } from "react-router-dom";

export function DesktopNav() {
  const location = useLocation();
  const { data } = useSession();
  const role = data?.role;

  return (
    <div className="hidden md:flex items-center justify-between py-4">
      <Link to="/" className="font-bold text-2xl">
        HealthLink
      </Link>
      
        <div className="flex items-center gap-6">
          <Button variant="ghost" asChild>
            <Link to="/" className={location.pathname === "/" ? "text-primary" : ""}>
              Home
            </Link>
          </Button>
          
          <Button variant="ghost" asChild>
            <Link to="/search" className={location.pathname === "/search" ? "text-primary" : ""}>
              Find Providers
            </Link>
          </Button>
          
          <Button variant="ghost" asChild>
            <Link 
              to="/appointments" 
              className={location.pathname.includes("appointment") ? "text-primary" : ""}
            >
              Appointments
            </Link>
          </Button>
          
          <Button variant="ghost" asChild>
            <Link to="/chat" className={location.pathname === "/chat" ? "text-primary" : ""}>
              Messages
            </Link>
          </Button>
          
          {role === "health_personnel" && (
            <Button variant="ghost" asChild>
              <Link 
                to="/provider-dashboard" 
                className={location.pathname === "/provider-dashboard" ? "text-primary" : ""}
              >
                Provider Dashboard
              </Link>
            </Button>
          )}
          
          {role === "admin" && (
            <Button variant="ghost" asChild>
              <Link 
                to="/admin-dashboard" 
                className={location.pathname === "/admin-dashboard" ? "text-primary" : ""}
              >
                Admin Dashboard
              </Link>
            </Button>
          )}
        </div>
      
      {data ? (
        <div className="flex items-center gap-4">
          <Link to="/profile">
            <img
              src={data.avatar_url || "/placeholder.svg"}
              alt="Avatar"
              className="rounded-full w-8 h-8 object-cover"
            />
          </Link>
          <a href="/logout">Logout</a>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
