import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserRoles } from '@/context/UserRolesContext';
import { getRoleNavigation } from '@/utils/rolePermissions';
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
import { Badge } from '@/components/ui/badge';

interface RoleBasedMenuProps {
  className?: string;
}

export const RoleBasedMenu: React.FC<RoleBasedMenuProps> = ({ className }) => {
  const { user } = useAuth();
  const { availableRoles, primaryRole } = useUserRoles();
  const navigation = getRoleNavigation(availableRoles);

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
      case 'pharmacy':
        return 'Pharmacy';
      case 'institution_admin':
        return 'Institution Admin';
      case 'institution_staff':
        return 'Institution Staff';
      case 'admin':
        return 'Administrator';
      default:
        return 'User';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'health_personnel':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pharmacy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'institution_admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-1">
            <span>{getRoleDisplayName(primaryRole)} Menu</span>
            {availableRoles && availableRoles.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {availableRoles.map((role) => (
                  <Badge 
                    key={role} 
                    variant="outline" 
                    className={`text-xs ${getRoleBadgeColor(role)}`}
                  >
                    {getRoleDisplayName(role)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
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
        <DropdownMenuItem className="text-muted-foreground text-xs">
          {user?.email}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleBasedMenu;
