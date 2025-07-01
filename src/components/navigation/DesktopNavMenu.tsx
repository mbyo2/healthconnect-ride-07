
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
import { MoreHorizontal } from "lucide-react";

interface NavItemType {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface DesktopNavMenuProps {
  secondaryNavItems: NavItemType[];
}

export function DesktopNavMenu({ secondaryNavItems }: DesktopNavMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center px-4 py-2 rounded-xl hover:bg-trust-50 hover:text-trust-700">
          <MoreHorizontal className="h-5 w-5 mr-2" />
          More
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border-trust-200 shadow-xl">
        <DropdownMenuLabel className="text-trust-700 font-semibold">Quick Access</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {secondaryNavItems.map((item, index) => (
          <DropdownMenuItem key={index} asChild className="hover:bg-trust-50">
            <Link to={item.to} className="flex items-center">
              {item.icon}
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
