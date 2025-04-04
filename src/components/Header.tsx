import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import { ModeToggle } from "@/components/ModeToggle";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { useSearch } from "@/context/SearchContext";
import { useEffect } from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils";
import { UserRole, AdminLevel } from "@/types/user";
import { ShieldAlert } from "lucide-react";

export function Header() {
  const { user, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { setSearch } = useSearch();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (profile?.role) {
      setUserRole(profile.role as UserRole);
      setAdminLevel(profile.admin_level as AdminLevel);
    }
  }, [profile]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
      toast({
        title: "Signed out successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem signing you out.",
      });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchTerm);
    navigate("/search");
  };

  return (
    <header className="bg-background sticky top-0 z-50 w-full border-b">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <Sheet>
          <SheetTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                {user?.email}
              </SheetDescription>
            </SheetHeader>
            <DropdownMenuSeparator />
            <Link to="/symptoms">
              <DropdownMenuItem>
                Symptoms
              </DropdownMenuItem>
            </Link>
            <Link to="/search">
              <DropdownMenuItem>
                Search
              </DropdownMenuItem>
            </Link>
            <Link to="/map">
              <DropdownMenuItem>
                Map
              </DropdownMenuItem>
            </Link>
            <Link to="/chat">
              <DropdownMenuItem>
                Chat
              </DropdownMenuItem>
            </Link>
             <Link to="/appointments">
              <DropdownMenuItem>
                Appointments
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <Link to="/profile">
              <DropdownMenuItem>
                Profile
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </SheetContent>
        </Sheet>
        <Link to="/" className="hidden sm:block font-bold">
          Healthcare Platform
        </Link>
        <NavigationMenu className="hidden sm:block">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/symptoms" className={cn(
                navigationMenuTriggerStyle(),
                location.pathname === "/symptoms" ? "bg-secondary text-secondary-foreground" : ""
              )} size="sm">
                Symptoms
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/search" className={cn(
                navigationMenuTriggerStyle(),
                location.pathname === "/search" ? "bg-secondary text-secondary-foreground" : ""
              )} size="sm">
                Search
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/map" className={cn(
                navigationMenuTriggerStyle(),
                location.pathname === "/map" ? "bg-secondary text-secondary-foreground" : ""
              )} size="sm">
                Map
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/chat" className={cn(
                navigationMenuTriggerStyle(),
                location.pathname === "/chat" ? "bg-secondary text-secondary-foreground" : ""
              )} size="sm">
                Chat
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/appointments" className={cn(
                navigationMenuTriggerStyle(),
                location.pathname === "/appointments" ? "bg-secondary text-secondary-foreground" : ""
              )} size="sm">
                Appointments
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex items-center space-x-4">
          <SearchBar />
          {isMounted && theme ? (
            <ModeToggle />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || ""} alt={user?.email || "Avatar"} />
                  <AvatarFallback>{user?.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {adminLevel === 'superadmin' && (
                <DropdownMenuItem asChild>
                  <Link to="/superadmin-dashboard" className="flex items-center">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Superadmin Dashboard
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
