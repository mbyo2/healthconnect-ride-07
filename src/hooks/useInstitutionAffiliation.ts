import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if the current user is employed by an institution.
 * Institution-affiliated staff should NOT see personal Earnings/Wallet
 * since they are salaried employees, not independent consultants.
 */
export function useInstitutionAffiliation() {
  const { user } = useAuth();
  const [isInstitutionAffiliated, setIsInstitutionAffiliated] = useState(false);
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsInstitutionAffiliated(false);
      setInstitutionId(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        // 1. Check if user is institution admin/owner
        const { data: owned } = await supabase
          .from('healthcare_institutions')
          .select('id')
          .eq('admin_id', user.id)
          .limit(1)
          .maybeSingle();

        if (owned?.id) {
          setIsInstitutionAffiliated(true);
          setInstitutionId(owned.id);
          return;
        }

        // 2. Check institution_staff
        const { data, error } = await supabase
          .from('institution_staff')
          .select('institution_id')
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data?.institution_id) {
          setIsInstitutionAffiliated(true);
          setInstitutionId(data.institution_id);
          return;
        }

        // 3. Check institution_personnel (legacy + signup-created)
        const { data: personnel } = await supabase
          .from('institution_personnel')
          .select('institution_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (personnel?.institution_id) {
          setIsInstitutionAffiliated(true);
          setInstitutionId(personnel.institution_id);
        } else {
          setIsInstitutionAffiliated(false);
          setInstitutionId(null);
        }
      } catch {
        setIsInstitutionAffiliated(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user]);

  return { isInstitutionAffiliated, institutionId, loading };
}
