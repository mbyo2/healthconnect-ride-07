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
        const { data, error } = await supabase
          .from('institution_staff')
          .select('institution_id')
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data?.institution_id) {
          setIsInstitutionAffiliated(true);
          setInstitutionId(data.institution_id);
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
