
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface NavItemType {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface DesktopNavMenuProps {
  secondaryNavItems: NavItemType[];
}

export function DesktopNavMenu({ secondaryNavItems }: DesktopNavMenuProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  useEffect(() => { setOpen(false); }, [location.pathname]);
  
  const isActiveSecondaryPage = secondaryNavItems.some(item => location.pathname === item.to);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActiveSecondaryPage
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 max-h-[70vh] overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Quick Access</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {secondaryNavItems.map((item, index) => (
          <DropdownMenuItem key={index} asChild onClick={() => setOpen(false)}>
            <Link 
              to={item.to} 
              className={`flex items-center justify-between w-full ${
                location.pathname === item.to ? "text-primary font-medium" : ""
              }`}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
