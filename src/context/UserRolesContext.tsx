
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
  const { profile, user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      if (user && profile) {
        // Fetch all roles for the user from user_roles table
        const { data: rolesData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching roles:', error);
          // Fallback to profile role
          const fallbackRole = profile.role as UserRole;
          setUserRole(fallbackRole);
          setCurrentRole(fallbackRole);
          setAvailableRoles(fallbackRole ? [fallbackRole] : []);
        } else if (rolesData && rolesData.length > 0) {
          const roles = rolesData.map(r => r.role as UserRole);
          setAvailableRoles(roles);
          
          // Set primary role (admin > institution_admin > health_personnel > patient)
          const primaryRole = roles.find(r => r === 'admin') ||
                             roles.find(r => r === 'institution_admin') ||
                             roles.find(r => r === 'health_personnel') ||
                             roles.find(r => r === 'patient') ||
                             roles[0];
          
          setUserRole(primaryRole);
          setCurrentRole(primaryRole);

          // Check admin status by looking at roles
          const isAdminRole = roles.includes('admin');
          
          if (isAdminRole) {
            setAdminLevel('admin');
          } else {
            setAdminLevel(profile.admin_level as AdminLevel);
          }
        }
      } else {
        setUserRole(null);
        setAdminLevel(null);
        setCurrentRole(null);
        setAvailableRoles([]);
      }
    };

    fetchRoles();
  }, [profile, user]);

  const hasRole = (roles: UserRole[]): boolean => {
    return roles.some(role => availableRoles.includes(role));
  };

  const hasAdminLevel = (levels: AdminLevel[]): boolean => {
    return adminLevel ? levels.includes(adminLevel) : false;
  };

  const checkRole = async (role: UserRole): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: role });
    if (error) {
      console.error('Error checking role:', error);
      return false;
    }
    return data || false;
  };

  const isAdmin = adminLevel === 'admin' || adminLevel === 'superadmin';
  const isSuperAdmin = adminLevel === 'superadmin';
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
