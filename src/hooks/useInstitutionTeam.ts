import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface InstitutionTeamStatus {
  loading: boolean;
  /** Institution owner (healthcare_institutions.admin_id) or platform admin. */
  isAdmin: boolean;
  /** Any member of the institution team (admin, staff, personnel). */
  isMember: boolean;
  /** Platform-level admin / super_admin (has_admin_scope). */
  isPlatformAdmin: boolean;
  /** Institution admin or a manager (user_manages_institution). */
  canManageStaff: boolean;
}

/**
 * Role facts for create-on-missing gates (Patient Unity W4). The database
 * RLS policies remain the real gate — these flags only decide whether the
 * "+ Create" affordance is offered or replaced with a plain-language note
 * naming who can add the record. Backed by the same SECURITY DEFINER
 * helpers the policies use, so the UI and the DB agree.
 */
export function useInstitutionTeam(institutionId?: string | null): InstitutionTeamStatus {
  const { user } = useAuth();
  const [state, setState] = useState<InstitutionTeamStatus>({
    loading: true,
    isAdmin: false,
    isMember: false,
    isPlatformAdmin: false,
    canManageStaff: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ loading: false, isAdmin: false, isMember: false, isPlatformAdmin: false, canManageStaff: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const calls: Promise<any>[] = [
          (supabase.rpc as any)("has_admin_scope", { p_uid: user.id }),
        ];
        if (institutionId) {
          calls.push((supabase.rpc as any)("is_institution_admin", { institution_id: institutionId }));
          calls.push((supabase.rpc as any)("is_institution_member", { p_institution_id: institutionId }));
          calls.push((supabase.rpc as any)("user_manages_institution", { inst_id: institutionId }));
        }
        const [platformRes, adminRes, memberRes, managerRes] = await Promise.all(calls);
        if (cancelled) return;
        const isPlatformAdmin = platformRes?.data === true;
        const isInstitutionAdmin = adminRes?.data === true;
        setState({
          loading: false,
          isPlatformAdmin,
          isAdmin: isInstitutionAdmin || isPlatformAdmin,
          isMember: memberRes?.data === true || isInstitutionAdmin || isPlatformAdmin,
          canManageStaff: isInstitutionAdmin || managerRes?.data === true || isPlatformAdmin,
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, isAdmin: false, isMember: false, isPlatformAdmin: false, canManageStaff: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, institutionId]);

  return state;
}

export default useInstitutionTeam;
