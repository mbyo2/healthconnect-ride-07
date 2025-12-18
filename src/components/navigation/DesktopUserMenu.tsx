
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Calendar, Users, Settings, Heart } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  role?: string;
  admin_level?: string;
  avatar_url?: string;
}

interface DesktopUserMenuProps {
  user: SupabaseUser;
  profile: Profile | null;
  onLogout: () => void;
}

export function DesktopUserMenu({ user, profile, onLogout }: DesktopUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0 ring-2 ring-trust-200 hover:ring-trust-400">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || ""} alt={user?.email || ""} />
            <AvatarFallback className="bg-trust-100 text-trust-700 font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white border-trust-200 shadow-xl z-50 max-h-[80vh] overflow-y-auto">
        <DropdownMenuLabel className="pb-2">
          <div className="text-sm font-semibold text-trust-700">{user.email}</div>
          <div className="text-xs text-muted-foreground">My Account</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="hover:bg-trust-50">
          <Link to="/profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-trust-50">
          <Link to="/appointments" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            My Appointments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-trust-50">
          <Link to="/connections" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            My Providers
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-trust-50">
          <Link to="/settings" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {profile?.role === "health_personnel" && (
          <DropdownMenuItem asChild className="hover:bg-trust-50">
            <Link to="/provider-dashboard" className="flex items-center">
              <Heart className="h-4 w-4 mr-2" />
              Provider Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        {(profile?.admin_level === "admin" || profile?.admin_level === "superadmin") && (
          <DropdownMenuItem asChild className="hover:bg-trust-50">
            <Link to="/admin-dashboard" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onLogout();
          }}
          className="text-red-600 hover:bg-red-50 cursor-pointer"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
