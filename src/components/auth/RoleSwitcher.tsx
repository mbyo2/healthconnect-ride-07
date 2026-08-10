import { useUserRoles } from '@/context/UserRolesContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/user';
import { ROLE_META } from '@/config/roleConfig';
import { ChevronDown, User, Stethoscope, ShieldCheck, Building, Building2, FlaskConical, Pill, Heart, Award, Scan, UserCheck, Droplet, Microscope, Phone, Users, Crown, Scissors, Receipt, Package, AlertTriangle, Wrench, Truck, Headphones, Shield } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Stethoscope,
  ShieldCheck,
  Building,
  Building2,
  FlaskConical,
  Pill,
  Heart,
  Award,
  Scan,
  UserCheck,
  Droplet,
  Microscope,
  Phone,
  Users,
  Crown,
  Scissors,
  Receipt,
  Package,
  AlertTriangle,
  Wrench,
  Truck,
  Shield,
  Headphones,
};

export const RoleSwitcher = () => {
  const { currentRole, availableRoles, switchRole } = useUserRoles();
  const navigate = useNavigate();

  if (!availableRoles || availableRoles.length <= 1) return null;

  const getRoleIcon = (role: UserRole) => {
    const meta = ROLE_META[role];
    const IconComponent = meta ? ICON_MAP[meta.icon] || User : User;
    return <IconComponent className="h-4 w-4" />;
  };

  const getRoleLabel = (role: UserRole) => {
    const meta = ROLE_META[role];
    return meta ? `${meta.label} View` : `${role} View`;
  };

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    const landing = ROLE_META[role]?.landingPage || '/dashboard';
    navigate(landing);
  };

  const activeRole = currentRole || availableRoles[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs font-medium">
          {getRoleIcon(activeRole)}
          <Badge variant="secondary" className="text-[10px] capitalize">
            {getRoleLabel(activeRole)}
          </Badge>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 max-h-80 overflow-y-auto">
        {availableRoles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={`cursor-pointer ${activeRole === role ? 'bg-accent font-semibold' : ''}`}
          >
            <div className="flex items-center gap-2 text-xs">
              {getRoleIcon(role)}
              <span>{ROLE_META[role]?.label || role}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
