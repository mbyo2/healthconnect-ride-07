import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getActiveInstitutionOverride,
  resolveActiveInstitutionId,
  INSTITUTION_SWITCH_EVENT,
  type InstitutionAffiliation,
} from './useInstitutionContext';

/**
 * Checks if the current user is employed by an institution.
 * Institution-affiliated staff should NOT see personal Earnings/Wallet
 * since they are salaried employees, not independent consultants.
 *
 * The institution returned is the user's ACTIVE workspace — the exact same
 * resolution useInstitutionContext performs (persisted switcher override
 * first, else newest owned institution, else first staff membership), and
 * it re-resolves on every workspace switch. Before 2026-11-24 this hook
 * took `.limit(1)` with no ordering and ignored the override entirely, so
 * consumers (notably the hospital inventory workflow) were pinned to an
 * arbitrary single institution even when the user had switched workspace.
 */
export function useInstitutionAffiliation() {
  const { user } = useAuth();
  const [isInstitutionAffiliated, setIsInstitutionAffiliated] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user) {
      setIsInstitutionAffiliated(false);
      setInstitutionId(null);
      setLoading(false);
      return;
    }

    try {
      // Candidate affiliations in the same priority order
      // useInstitutionContext builds them: owned (newest first), then
      // institution_staff, then legacy institution_personnel.
      const affils: Pick<InstitutionAffiliation, 'id' | 'affiliation'>[] = [];
      const seen = new Set<string>();
      const push = (id: string | null | undefined, affiliation: 'admin' | 'staff') => {
        if (id && !seen.has(id)) {
          seen.add(id);
          affils.push({ id, affiliation });
        }
      };

      const { data: owned } = await supabase
        .from('healthcare_institutions')
        .select('id')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });
      for (const r of owned || []) push((r as any).id, 'admin');

      const { data: staffRows } = await supabase
        .from('institution_staff')
        .select('institution_id')
        .eq('provider_id', user.id)
        .eq('is_active', true);
      for (const r of (staffRows as any[] | null) || []) push(r?.institution_id, 'staff');

      const { data: personnelRows } = await (supabase as any)
        .from('institution_personnel')
        .select('institution_id')
        .eq('user_id', user.id)
        .eq('status', 'active');
      for (const r of (personnelRows as any[] | null) || []) push(r?.institution_id, 'staff');

      const { activeId } = resolveActiveInstitutionId(
        affils,
        getActiveInstitutionOverride(user.id),
      );
      setIsInstitutionAffiliated(affils.length > 0);
      setInstitutionId(activeId);
    } catch {
      setIsInstitutionAffiliated(false);
      setInstitutionId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    check();
  }, [check]);

  // Follow workspace switches made anywhere else in the app (header
  // switcher, dashboard switcher) so this hook's consumers re-scope too.
  useEffect(() => {
    const onSwitch = () => check();
    window.addEventListener(INSTITUTION_SWITCH_EVENT, onSwitch);
    return () => window.removeEventListener(INSTITUTION_SWITCH_EVENT, onSwitch);
  }, [check]);

  return { isInstitutionAffiliated, institutionId, loading };
}
