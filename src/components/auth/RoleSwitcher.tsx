
import { useState } from 'react';
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
import { ChevronDown } from 'lucide-react';

export const RoleSwitcher = () => {
  const { userRole, adminLevel, isAdmin, isHealthPersonnel } = useUserRoles();
  const [currentView, setCurrentView] = useState<UserRole | 'admin'>(userRole || 'patient');

  if (!userRole) return null;

  const availableViews: { role: UserRole | 'admin'; label: string }[] = [
    { role: 'patient', label: 'Patient View' },
  ];

  if (isHealthPersonnel) {
    availableViews.push({ role: 'health_personnel', label: 'Provider View' });
  }

  if (isAdmin) {
    availableViews.push({ role: 'admin', label: 'Admin View' });
  }

  if (availableViews.length <= 1) return null;

  const currentViewLabel = availableViews.find(v => v.role === currentView)?.label || 'Patient View';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Badge variant="secondary">{currentViewLabel}</Badge>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableViews.map((view) => (
          <DropdownMenuItem
            key={view.role}
            onClick={() => setCurrentView(view.role)}
            className={currentView === view.role ? 'bg-accent' : ''}
          >
            {view.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
