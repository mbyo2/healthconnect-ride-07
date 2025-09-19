
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
  
  // Close dropdown when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  
  // Check if any secondary nav item is currently active
  const isActiveSecondaryPage = secondaryNavItems.some(item => location.pathname === item.to);
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`flex items-center px-4 py-2 rounded-xl transition-all duration-300 ${
            isActiveSecondaryPage 
              ? "bg-trust-600 text-white shadow-lg" 
              : "hover:bg-trust-50 hover:text-trust-700"
          } ${
            open ? "opacity-100" : isActiveSecondaryPage ? "opacity-100" : "opacity-100 hover:opacity-90"
          }`}
        >
          <MoreHorizontal className="h-5 w-5 mr-2" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={`w-56 bg-white border-trust-200 shadow-xl transition-all duration-200 ease-out max-h-96 overflow-y-auto ${
          open ? "opacity-100 scale-100 animate-in fade-in-0 zoom-in-95" : "opacity-0 scale-95 animate-out fade-out-0 zoom-out-95"
        }`}
      >
        <DropdownMenuLabel className="text-trust-700 font-semibold">Quick Access</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {secondaryNavItems.map((item, index) => (
          <DropdownMenuItem 
            key={index} 
            asChild 
            className={`hover:bg-trust-50 transition-all duration-200 ${
              location.pathname === item.to ? "bg-trust-50 text-trust-700 font-medium" : ""
            }`}
            onClick={() => setOpen(false)}
          >
            <Link 
              to={item.to} 
              className="flex items-center justify-between w-full"
              onClick={() => {
                // Add dissolving animation before navigation
                setOpen(false);
              }}
            >
              <div className="flex items-center">
                {item.icon}
                {item.label}
              </div>
              {item.badge && (
                <span className={`text-xs px-2 py-1 rounded-full font-medium transition-all duration-200 ${
                  item.badge === 'NEW' ? 'bg-green-100 text-green-700' :
                  item.badge === 'AI' ? 'bg-blue-100 text-blue-700' :
                  item.badge === 'SECURE' ? 'bg-purple-100 text-purple-700' :
                  item.badge === 'LIVE' ? 'bg-red-100 text-red-700' :
                  item.badge === '24/7' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
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
