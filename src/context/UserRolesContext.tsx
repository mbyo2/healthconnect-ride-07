
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserRole, AdminLevel } from '@/types/user';

interface UserRolesContextType {
  userRole: UserRole | null;
  adminLevel: AdminLevel | null;
  hasRole: (roles: UserRole[]) => boolean;
  hasAdminLevel: (levels: AdminLevel[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHealthPersonnel: boolean;
  isPatient: boolean;
  refreshRoles: () => void;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export function UserRolesProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);

  useEffect(() => {
    if (profile) {
      setUserRole(profile.role as UserRole);
      setAdminLevel(profile.admin_level as AdminLevel);
    } else {
      setUserRole(null);
      setAdminLevel(null);
    }
  }, [profile]);

  const hasRole = (roles: UserRole[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  const hasAdminLevel = (levels: AdminLevel[]): boolean => {
    return adminLevel ? levels.includes(adminLevel) : false;
  };

  const isAdmin = adminLevel === 'admin' || adminLevel === 'superadmin';
  const isSuperAdmin = adminLevel === 'superadmin';
  const isHealthPersonnel = userRole === 'health_personnel';
  const isPatient = userRole === 'patient';

  const refreshRoles = () => {
    if (profile) {
      setUserRole(profile.role as UserRole);
      setAdminLevel(profile.admin_level as AdminLevel);
    }
  };

  const value = {
    userRole,
    adminLevel,
    hasRole,
    hasAdminLevel,
    isAdmin,
    isSuperAdmin,
    isHealthPersonnel,
    isPatient,
    refreshRoles,
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
