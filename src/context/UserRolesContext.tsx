
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserRole, AdminLevel } from '@/types/user';
import { supabase } from '@/integrations/supabase/client';

interface UserRolesContextType {
  userRole: UserRole | null;
  adminLevel: AdminLevel | null;
  currentRole: UserRole | null;
  primaryRole: UserRole | null;
  availableRoles: UserRole[];
  loading: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  hasAdminLevel: (levels: AdminLevel[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHealthPersonnel: boolean;
  isPatient: boolean;
  switchRole: (role: UserRole) => void;
  refreshRoles: () => void;
  checkRole: (role: UserRole) => Promise<boolean>;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export function UserRolesProvider({ children }: { children: React.ReactNode }) {
  const { profile, user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchRoles = async () => {
      // If we have a user but no profile yet, we should stay in loading state
      // to avoid RouteGuard seeing empty roles and redirecting.
      // However, we shouldn't hang here forever.
      if (user && !profile) {
        setLoading(true);

        // Safety timeout to prevent hanging forever if profile fetch fails
        timeoutId = setTimeout(() => {
          if (mounted && !profile && loading) {
            console.warn('Profile fetch timed out in UserRolesContext, falling back to patient role');
            setUserRole('patient');
            setCurrentRole('patient');
            setAvailableRoles(['patient']);
            setLoading(false);
          }
        }, 5000); // 5 seconds safety timeout

        return;
      }

      if (user) {
        setLoading(true);
        try {
          // 1. Fetch roles from user_roles table
          const { data: rolesData, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          const rawRoles: string[] = [];

          if (!error && rolesData && rolesData.length > 0) {
            rolesData.forEach(r => { if (r.role) rawRoles.push(r.role); });
          }

          // 2. Add profile role
          if (profile?.role) {
            rawRoles.push(profile.role);
          }

          // 3. Add user_metadata roles
          const metaRole = user.user_metadata?.role;
          const metaBusinessType = user.user_metadata?.business_type;
          const metaProviderType = user.user_metadata?.providerType;
          if (metaRole) rawRoles.push(metaRole);
          if (metaBusinessType) {
            if (metaBusinessType === 'pharmacy') rawRoles.push('pharmacy', 'pharmacist');
            else if (metaBusinessType === 'laboratory') rawRoles.push('lab', 'lab_technician');
            else rawRoles.push('institution_admin');
          }
          if (metaProviderType) rawRoles.push(metaProviderType);

          // 4. Role Expansion for related capabilities
          const expandedRoles = new Set<UserRole>();
          rawRoles.forEach(r => {
            const roleStr = r.toLowerCase();
            if (roleStr === 'pharmacy') {
              expandedRoles.add('pharmacy');
              expandedRoles.add('pharmacist');
              expandedRoles.add('institution_admin');
            } else if (roleStr === 'pharmacist') {
              expandedRoles.add('pharmacist');
              expandedRoles.add('pharmacy');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'lab' || roleStr === 'laboratory') {
              expandedRoles.add('lab');
              expandedRoles.add('lab_technician');
              expandedRoles.add('institution_admin');
            } else if (roleStr === 'lab_technician') {
              expandedRoles.add('lab_technician');
              expandedRoles.add('lab');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'doctor') {
              expandedRoles.add('doctor');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'nurse') {
              expandedRoles.add('nurse');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'radiologist') {
              expandedRoles.add('radiologist');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'pathologist') {
              expandedRoles.add('pathologist');
              expandedRoles.add('health_personnel');
            } else if (roleStr === 'institution_admin' || roleStr === 'hospital' || roleStr === 'clinic') {
              expandedRoles.add('institution_admin');
              expandedRoles.add('institution_staff');
            } else if (roleStr === 'superadmin' || roleStr === 'super_admin') {
              expandedRoles.add('super_admin');
              expandedRoles.add('admin');
            } else if (roleStr === 'admin') {
              expandedRoles.add('admin');
            } else if (roleStr === 'patient') {
              expandedRoles.add('patient');
            } else {
              expandedRoles.add(roleStr as UserRole);
            }
          });

          if (expandedRoles.size === 0) {
            expandedRoles.add('patient');
          }

          const roles = Array.from(expandedRoles);
          setAvailableRoles(roles);

          // Role priority ranking for setting primary role
          const rolePriority: UserRole[] = [
            'super_admin', 'admin', 'support', 'cxo',
            'pharmacy', 'pharmacist',
            'lab', 'lab_technician',
            'institution_admin', 'institution_staff',
            'doctor', 'nurse', 'radiologist', 'pathologist', 'specialist', 'health_personnel',
            'ot_staff', 'triage_staff', 'receptionist', 'hr_manager', 'billing_staff',
            'phlebotomist',
            'inventory_manager', 'maintenance_manager', 'ambulance_staff',
            'patient'
          ];
          const primaryRole = rolePriority.find(r => roles.includes(r)) || roles[0];

          setUserRole(primaryRole);
          setCurrentRole(primaryRole);

          if (roles.includes('admin') || roles.includes('super_admin')) {
            setAdminLevel(roles.includes('super_admin') ? 'superadmin' : 'admin');
          } else {
            setAdminLevel(profile?.admin_level as AdminLevel);
          }

          // Ensure role is recorded in user_roles table in background if missing
          if (!rolesData || rolesData.length === 0) {
            supabase.from('user_roles').insert({
              user_id: user.id,
              role: primaryRole as any,
            }).then(() => {});
          }
        } catch (err) {
          console.error('Unexpected error in fetchRoles:', err);
          const fallbackRole = (profile?.role || user.user_metadata?.role || 'patient') as UserRole;
          setAvailableRoles([fallbackRole]);
          setUserRole(fallbackRole);
          setCurrentRole(fallbackRole);
        } finally {
          setLoading(false);
        }
      } else if (!user && !authLoading) {
        setUserRole(null);
        setAdminLevel(null);
        setCurrentRole(null);
        setAvailableRoles([]);
        setLoading(false);
      }
    };

    fetchRoles();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [profile, user, authLoading]);

  const hasRole = (roles: UserRole[]): boolean => {
    return roles.some(role => availableRoles.includes(role));
  };

  const hasAdminLevel = (levels: AdminLevel[]): boolean => {
    return adminLevel ? levels.includes(adminLevel) : false;
  };

  const checkRole = async (role: UserRole): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: role as any });
    if (error) {
      console.error('Error checking role:', error);
      return false;
    }
    return data || false;
  };

  const isAdmin = adminLevel === 'admin' || adminLevel === 'superadmin' || availableRoles.includes('admin') || availableRoles.includes('super_admin');
  const isSuperAdmin = adminLevel === 'superadmin' || availableRoles.includes('super_admin');
  const isHealthPersonnel = availableRoles.includes('health_personnel');
  const isPatient = availableRoles.includes('patient');

  const switchRole = (role: UserRole) => {
    if (availableRoles.includes(role)) {
      setCurrentRole(role);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesData && rolesData.length > 0) {
        const roles = rolesData.map(r => r.role as UserRole);
        setAvailableRoles(roles);
        const primaryRole = roles[0] as UserRole;
        setUserRole(primaryRole);
        setCurrentRole(primaryRole);
      }
    }
  };

  const value = {
    userRole,
    adminLevel,
    currentRole,
    primaryRole: userRole,
    availableRoles,
    loading,
    hasRole,
    hasAdminLevel,
    isAdmin,
    isSuperAdmin,
    isHealthPersonnel,
    isPatient,
    switchRole,
    refreshRoles,
    checkRole,
  };

  return (
    <UserRolesContext.Provider value={value}>
      {children}
    </UserRolesContext.Provider>
  );
}

export const useUserRoles = () => {
  const context = useContext(UserRolesContext);
  if (context === undefined) {
    throw new Error('useUserRoles must be used within a UserRolesProvider');
  }
  return context;
};
