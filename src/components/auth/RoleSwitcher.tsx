
import { useUserRoles } from '@/context/UserRolesContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/user';
import { ChevronDown, User, Stethoscope, ShieldCheck, Building2 } from 'lucide-react';

export const RoleSwitcher = () => {
  const { userRole, adminLevel, isAdmin, isHealthPersonnel, currentRole, availableRoles, switchRole } = useUserRoles();

  if (!userRole) return null;

  const getRoleIcon = (role: UserRole | 'admin') => {
    switch (role) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'health_personnel':
        return <Stethoscope className="h-4 w-4" />;
      case 'admin':
        return <ShieldCheck className="h-4 w-4" />;
      case 'institution_admin':
        return <Building2 className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: UserRole | 'admin') => {
    switch (role) {
      case 'patient':
        return 'Patient View';
      case 'health_personnel':
        return 'Provider View';
      case 'admin':
        return 'Admin View';
      case 'institution_admin':
        return 'Institution View';
      default:
        return 'Patient View';
    }
  };

  const availableViews: { role: UserRole | 'admin'; label: string }[] = [
    { role: 'patient', label: 'Patient View' },
  ];

  if (isHealthPersonnel) {
    availableViews.push({ role: 'health_personnel', label: 'Provider View' });
  }

  if (isAdmin) {
    availableViews.push({ role: 'admin', label: 'Admin View' });
  }

  if (userRole === 'institution_admin') {
    availableViews.push({ role: 'institution_admin', label: 'Institution View' });
  }

  if (availableViews.length <= 1) return null;

  const currentViewRole = isAdmin && currentRole !== 'health_personnel' && currentRole !== 'institution_admin' ? 'admin' : currentRole;
  const currentViewLabel = getRoleLabel(currentViewRole || 'patient');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getRoleIcon(currentViewRole || 'patient')}
          <Badge variant="secondary">{currentViewLabel}</Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableViews.map((view) => (
          <DropdownMenuItem
            key={view.role}
            onClick={() => switchRole(view.role as UserRole)}
            className={currentViewRole === view.role ? 'bg-accent' : ''}
          >
            <div className="flex items-center gap-2">
              {getRoleIcon(view.role)}
              {view.label}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
