
import { useState } from 'react';
import { useUserRoles } from '@/context/UserRolesContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronDown, User, Stethoscope, Building2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function RoleSwitcher() {
  const { currentRole, availableRoles, switchRole } = useUserRoles();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Only show if user has multiple roles
  if (availableRoles.length <= 1) return null;

  const roleDisplay = (role: string) => {
    switch (role) {
      case 'patient':
        return { icon: <User className="h-4 w-4 mr-2" />, label: 'Patient', path: '/home' };
      case 'health_personnel':
        return { icon: <Stethoscope className="h-4 w-4 mr-2" />, label: 'Healthcare Provider', path: '/provider-dashboard' };
      case 'admin':
        return { icon: <ShieldCheck className="h-4 w-4 mr-2" />, label: 'Admin', path: '/admin-dashboard' };
      case 'institution_admin':
        return { icon: <Building2 className="h-4 w-4 mr-2" />, label: 'Institution Admin', path: '/institution-dashboard' };
      default:
        return { icon: <User className="h-4 w-4 mr-2" />, label: role, path: '/home' };
    }
  };

  const handleRoleSwitch = async (role: string) => {
    await switchRole(role as any);
    // Navigate to the appropriate dashboard based on the role
    const { path } = roleDisplay(role);
    navigate(path);
    setIsOpen(false);
  };

  const currentRoleInfo = roleDisplay(currentRole || 'patient');

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {currentRoleInfo.icon}
          <span className="hidden sm:inline">{currentRoleInfo.label}</span>
          <Badge variant="secondary" className="ml-2 hidden sm:flex">Mode</Badge>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const { icon, label } = roleDisplay(role);
          return (
            <DropdownMenuItem 
              key={role} 
              onClick={() => handleRoleSwitch(role)}
              className="cursor-pointer flex items-center"
              disabled={role === currentRole}
            >
              {icon}
              <span>{label}</span>
              {role === currentRole && <Badge className="ml-2">Active</Badge>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
