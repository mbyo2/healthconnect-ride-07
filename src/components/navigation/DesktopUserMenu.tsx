
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
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9 ring-2 ring-border hover:ring-primary/40 transition-all">
            <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || ""} alt={user?.email || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[60]">
        <DropdownMenuLabel>
          <div className="text-sm font-medium truncate">{user.email}</div>
          <div className="text-xs text-muted-foreground">My Account</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" /> My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> My Appointments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/connections" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> My Providers
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />

        {profile?.role === "health_personnel" && (
          <DropdownMenuItem asChild>
            <Link to="/provider-dashboard" className="flex items-center gap-2">
              <Heart className="h-4 w-4" /> Provider Dashboard
            </Link>
          </DropdownMenuItem>
        )}

        {(profile?.admin_level === "admin" || profile?.admin_level === "superadmin") && (
          <DropdownMenuItem asChild>
            <Link to="/admin-dashboard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); onLogout(); }}
          className="text-destructive cursor-pointer"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
