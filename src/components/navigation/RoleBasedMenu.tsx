import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { getRoleNavigation, UserRole } from '@/utils/rolePermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';

interface RoleBasedMenuProps {
  className?: string;
}

export const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ className }) => {
  const { userRole, user } = useAuth();
  const navigation = getRoleNavigation(userRole as UserRole);

  const getIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
    return IconComponent ? <IconComponent className="h-4 w-4 mr-2" /> : null;
  };

  const getRoleDisplayName = (role: string | null) => {
    switch (role) {
      case 'patient':
        return 'Patient';
      case 'health_personnel':
        return 'Healthcare Provider';
      case 'admin':
        return 'Administrator';
      default:
        return 'User';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {getRoleDisplayName(userRole)} Menu
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {navigation.map((item) => (
          <DropdownMenuItem key={item.path} asChild>
            <Link to={item.path} className="flex items-center cursor-pointer">
              {getIcon(item.icon)}
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground">
          Signed in as {user?.email}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleBasedMenu;
