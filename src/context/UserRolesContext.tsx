
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserRole, AdminLevel } from '@/types/user';

interface UserRolesContextType {
  userRole: UserRole | null;
  adminLevel: AdminLevel | null;
  currentRole: UserRole | null;
  availableRoles: UserRole[];
  hasRole: (roles: UserRole[]) => boolean;
  hasAdminLevel: (levels: AdminLevel[]) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isHealthPersonnel: boolean;
  isPatient: boolean;
  switchRole: (role: UserRole) => void;
  refreshRoles: () => void;
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export function UserRolesProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (profile) {
      setUserRole(profile.role as UserRole);
      setAdminLevel(profile.admin_level as AdminLevel);
      setCurrentRole(profile.role as UserRole);
    } else {
      setUserRole(null);
      setAdminLevel(null);
      setCurrentRole(null);
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

  // Calculate available roles based on user permissions
  const availableRoles: UserRole[] = [];
  if (userRole) {
    availableRoles.push('patient'); // Everyone can view patient role
    if (isHealthPersonnel) {
      availableRoles.push('health_personnel');
    }
    if (isAdmin) {
      availableRoles.push('admin');
    }
    if (userRole === 'institution_admin') {
      availableRoles.push('institution_admin');
    }
  }

  const switchRole = (role: UserRole) => {
    if (availableRoles.includes(role)) {
      setCurrentRole(role);
    }
  };

  const refreshRoles = () => {
    if (profile) {
      setUserRole(profile.role as UserRole);
      setAdminLevel(profile.admin_level as AdminLevel);
      setCurrentRole(profile.role as UserRole);
    }
  };

  const value = {
    userRole,
    adminLevel,
    currentRole,
    availableRoles,
    hasRole,
    hasAdminLevel,
    isAdmin,
    isSuperAdmin,
    isHealthPersonnel,
    isPatient,
    switchRole,
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
