// @ts-nocheck -- pre-existing loose Supabase typings; tracked for cleanup

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserRole, AdminLevel } from '@/types/user';
import { ROLE_PRIORITY } from '@/config/roleConfig';
import { withTimeout, TIMEOUTS } from '@/utils/async';
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

/** Order-insensitive comparison so setState only fires on real changes. */
function sameRoleSet(a: UserRole[], b: UserRole[]): boolean {
  return a.length === b.length && a.every(r => b.includes(r));
}

/**
 * Expand raw role strings (user_roles DB rows only) into the full
 * capability set. Single implementation used by both the initial fetch
 * and refreshRoles so the two can never disagree.
 *
 * SECURITY (P1-25): auth user_metadata is user-writable and is NEVER a
 * role source. Roles come from the server: user_roles rows (admin-granted,
 * RLS-enforced).
 *
 * P2-8 (Stage C2b): profiles.role / profiles.admin_level are NO LONGER
 * role sources anywhere — client or server. Every RLS policy that gated
 * on them was re-gated onto user_roles (has_role / has_admin_scope) in
 * the stagec2b_a migrations; the profiles columns survive only as
 * display/sync artefacts (kept in step by trg_sync_admin_level_from_roles).
 * Merging profile.role here historically injected the signup-trigger
 * default ('patient' for verified providers) into the available-role set
 * and let a stale admin_level confer admin UI affordances the server no
 * longer honours.
 *
 * Clinical cadres inherit the legacy 'health_personnel' catch-all so
 * provider dashboards, calendars and shared components keep working.
 */
const CLINICAL_WITH_PERSONNEL = new Set([
  'doctor', 'specialist', 'medical_licentiate', 'clinical_officer',
  'dentist', 'dental_therapist', 'radiologist', 'radiographer',
  'pathologist', 'physiotherapist', 'occupational_therapist',
  'nutritionist', 'optometrist', 'optician', 'psychologist',
  'environmental_health_officer', 'community_health_worker',
  'traditional_practitioner', 'pharmacist', 'pharmacy_technologist',
  'lab_technician', 'registered_nurse', 'enrolled_nurse', 'midwife',
]);

function expandRawRoles(rawRoles: string[]): UserRole[] {
  const expandedRoles = new Set<UserRole>();
  rawRoles.forEach(r => {
    const roleStr = r.toLowerCase();
    if (roleStr === 'pharmacy') {
      // NOTE (completeness pass 2026-10-25): 'institution_admin' is no
      // longer injected here. It outranks pharmacy in ROLE_PRIORITY, so a
      // pure pharmacy business account landed on /institution-dashboard —
      // a hospital surface its own permission set never granted — instead
      // of its portal. Genuine institution admins hold the raw role.
      expandedRoles.add('pharmacy');
      expandedRoles.add('pharmacist');
    } else if (roleStr === 'pharmacist') {
      expandedRoles.add('pharmacist');
      expandedRoles.add('pharmacy');
      expandedRoles.add('health_personnel');
    } else if (roleStr === 'wholesale_pharmacy' || roleStr === 'wholesale') {
      expandedRoles.add('wholesale_pharmacy');
    } else if (roleStr === 'lab' || roleStr === 'laboratory') {
      // Same fix as 'pharmacy' above: no injected 'institution_admin',
      // so lab business accounts land on /lab-management, their own home.
      expandedRoles.add('lab');
      expandedRoles.add('lab_technician');
    } else if (roleStr === 'lab_technician') {
      expandedRoles.add('lab_technician');
      expandedRoles.add('lab');
      expandedRoles.add('health_personnel');
    } else if (roleStr === 'nurse') {
      // Legacy catch-all nurse → canonical registered nurse cadre
      expandedRoles.add('nurse');
      expandedRoles.add('registered_nurse');
      expandedRoles.add('health_personnel');
    } else if (CLINICAL_WITH_PERSONNEL.has(roleStr)) {
      expandedRoles.add(roleStr as UserRole);
      expandedRoles.add('health_personnel');
    } else if (roleStr === 'medical_records_officer') {
      expandedRoles.add('medical_records_officer');
      expandedRoles.add('institution_staff');
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
  return Array.from(expandedRoles);
}

export function UserRolesProvider({ children }: { children: React.ReactNode }) {
  const { profile, user, isLoading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Key the effect on PRIMITIVES, not object identities: AuthContext creates a
  // fresh `profile` object on every fetchProfile (which runs on every auth
  // event, including TOKEN_REFRESHED). Depending on `profile`/`user` objects
  // refired this effect — and a full user_roles DB round-trip — constantly.
  const profileRole = profile?.role;
  const profileAdminLevel = profile?.admin_level;
  const userId = user?.id;

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
          // 1. Fetch roles from user_roles table — timed so a stalled
          // request falls back to profile roles instead of
          // hanging the route gate forever.
          let rolesData: any[] | null = null;
          try {
            const res = await withTimeout(
              supabase.from('user_roles').select('role').eq('user_id', user.id),
              TIMEOUTS.critical,
              'fetchRoles'
            );
            if (!res.error && res.data && res.data.length > 0) {
              rolesData = res.data;
            }
          } catch (rolesErr) {
            console.warn('Roles fetch timed out, using profile roles:', rolesErr);
          }

          const rawRoles: string[] = [];

          if (rolesData && rolesData.length > 0) {
            rolesData.forEach(r => { if (r.role) rawRoles.push(r.role); });
          }

          // 2. profiles.role is deliberately NOT merged (P2-8): it is a
          // display/sync artefact, not an authority. user_metadata is
          // likewise never read — it is user-writable and must never
          // confer a role (P1-25). If user_roles returned nothing,
          // expandRawRoles falls back to the 'patient' baseline.

          // 3. Role Expansion for related capabilities (shared helper)
          const roles = expandRawRoles(rawRoles);
          // Compare before setState: AuthContext creates a fresh profile
          // object on every fetchProfile (including TOKEN_REFRESHED), so
          // without this the roles effect refires constantly and re-renders
          // RoleRedirect / RouteGuard even when nothing actually changed.
          setAvailableRoles(prev => (sameRoleSet(prev, roles) ? prev : roles));

          // Primary role follows the central priority order (roleConfig).
          const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || roles[0];

          setUserRole(prev => (prev === primaryRole ? prev : primaryRole));
          setCurrentRole(prev => (prev === primaryRole ? prev : primaryRole));

          // Admin level derives ONLY from user_roles (P2-8) — never from
          // profiles.admin_level, which is a synced display artefact.
          const newAdminLevel = roles.includes('super_admin')
            ? 'superadmin'
            : roles.includes('admin')
              ? 'admin'
              : null;
          setAdminLevel(prev => (prev === newAdminLevel ? prev : newAdminLevel));

          // Baseline only (P1-25): if the server has no role rows for this
          // user, the client may attempt to record the baseline 'patient'
          // role — never a role derived from profile/metadata. Real role
          // grants are admin-only (user_roles INSERT policies) and normally
          // already exist via the signup trigger, so this is a no-op
          // safety net, not a grant path.
          if (!rolesData || rolesData.length === 0) {
            supabase.from('user_roles').insert({
              user_id: user.id,
              role: 'patient' as any,
            }).then(() => {});
          }
        } catch (err) {
          console.error('Unexpected error in fetchRoles:', err);
          // Degraded-mode fallback is the baseline 'patient' role only —
          // profiles.role must not confer roles even here (P2-8).
          const fallbackRole = 'patient' as UserRole;
          setAvailableRoles(prev => (sameRoleSet(prev, [fallbackRole]) ? prev : [fallbackRole]));
          setUserRole(prev => (prev === fallbackRole ? prev : fallbackRole));
          setCurrentRole(prev => (prev === fallbackRole ? prev : fallbackRole));
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
  // NOTE: primitives on purpose — never `profile`/`user` objects (see above).
  }, [profileRole, profileAdminLevel, userId, authLoading]);

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
        // Same single source (user_roles rows — never user_metadata,
        // never profiles.role; P2-8), same expansion AND same
        // primary-role selection as the initial fetch — the two can
        // never disagree.
        const rawRoles = rolesData.map(r => String(r.role));
        const roles = expandRawRoles(rawRoles);
        setAvailableRoles(prev => (sameRoleSet(prev, roles) ? prev : roles));
        const primaryRole = ROLE_PRIORITY.find(r => roles.includes(r)) || roles[0];
        setUserRole(prev => (prev === primaryRole ? prev : primaryRole));
        setCurrentRole(prev => (prev === primaryRole ? prev : primaryRole));
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
