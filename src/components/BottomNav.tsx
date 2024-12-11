import { Home, Search, Calendar, User, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const BottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="flex justify-between items-center">
        <Link
          to="/"
          className={`flex flex-col items-center ${
            isActive("/") ? "text-primary" : "text-gray-500"
          }`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link
          to="/search"
          className={`flex flex-col items-center ${
            isActive("/search") ? "text-primary" : "text-gray-500"
          }`}
        >
          <Search className="h-6 w-6" />
          <span className="text-xs mt-1">Search</span>
        </Link>
        <Link
          to="/map"
          className={`flex flex-col items-center ${
            isActive("/map") ? "text-primary" : "text-gray-500"
          }`}
        >
          <MapPin className="h-6 w-6" />
          <span className="text-xs mt-1">Map</span>
        </Link>
        <Link
          to="/appointments"
          className={`flex flex-col items-center ${
            isActive("/appointments") ? "text-primary" : "text-gray-500"
          }`}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">Bookings</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center ${
            isActive("/profile") ? "text-primary" : "text-gray-500"
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </div>
  );
};