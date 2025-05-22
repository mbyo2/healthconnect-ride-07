
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'patient' | 'health_personnel' | 'admin' | 'institution_admin' | null;

interface UserRolesContextType {
  currentRole: UserRole;
  isRoleLoading: boolean;
  canAccessRole: (role: UserRole) => boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  availableRoles: UserRole[];
}

const UserRolesContext = createContext<UserRolesContextType | undefined>(undefined);

export function UserRolesProvider({ children }: { children: ReactNode }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // Load user roles when authenticated and profile is loaded
  useEffect(() => {
    async function loadUserRoles() {
      if (!isAuthenticated || !user || !profile) {
        setCurrentRole(null);
        setAvailableRoles([]);
        setIsRoleLoading(false);
        return;
      }

      try {
        setIsRoleLoading(true);
        const roles: UserRole[] = [];
        
        // Add the primary role from the profile
        if (profile.role) {
          roles.push(profile.role as UserRole);
        }
        
        // Check if user is an institution admin
        const { data: institutionData } = await supabase
          .from('healthcare_institutions')
          .select('id')
          .eq('admin_id', user.id)
          .maybeSingle();
          
        if (institutionData) {
          roles.push('institution_admin');
        }
        
        // Set available roles
        setAvailableRoles(roles.filter(Boolean));
        
        // Set current role (default to the primary role or first available)
        const savedRole = localStorage.getItem('currentUserRole');
        const validRole = savedRole && roles.includes(savedRole as UserRole) 
          ? savedRole as UserRole 
          : roles[0] || null;
          
        setCurrentRole(validRole);
        
        if (validRole) {
          localStorage.setItem('currentUserRole', validRole);
        }
      } catch (error) {
        console.error('Error loading user roles:', error);
      } finally {
        setIsRoleLoading(false);
      }
    }

    loadUserRoles();
  }, [isAuthenticated, user, profile]);

  // Function to check if user can access a specific role
  const canAccessRole = (role: UserRole) => {
    if (!role) return true; // Public routes
    
    // Check if role is in available roles
    return availableRoles.includes(role);
  };

  // Function to switch between roles
  const switchRole = async (newRole: UserRole) => {
    if (!newRole || !canAccessRole(newRole)) {
      toast.error(`You don't have ${newRole} access`);
      return;
    }
    
    try {
      setCurrentRole(newRole);
      localStorage.setItem('currentUserRole', newRole);
      toast.success(`Switched to ${newRole} mode`);
    } catch (error) {
      console.error('Error switching role:', error);
      toast.error('Failed to switch role');
    }
  };

  // Context value
  const value = {
    currentRole,
    isRoleLoading,
    canAccessRole,
    switchRole,
    availableRoles
  };

  return <UserRolesContext.Provider value={value}>{children}</UserRolesContext.Provider>;
}

export const useUserRoles = () => {
  const context = useContext(UserRolesContext);
  if (context === undefined) {
    throw new Error('useUserRoles must be used within a UserRolesProvider');
  }
  return context;
};
