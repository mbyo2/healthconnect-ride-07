import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface InstitutionData {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_verified: boolean;
  admin_id: string;
  license_number?: string;
  operating_hours?: any;
  accepted_insurance_providers?: string[];
  currency?: string;
  created_at?: string;
}

/**
 * Unified hook for institution context. 
 * Checks both admin ownership and staff membership.
 * Use this instead of duplicating institution lookup logic in every page.
 */
export function useInstitutionContext() {
  const { user } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInstitution(null);
      setIsAdmin(false);
      setIsStaff(false);
      setLoading(false);
      return;
    }

    const fetchInstitution = async () => {
      try {
        // 1. Check if user is admin of an institution
        const { data: adminInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('admin_id', user.id)
          .maybeSingle();

        if (adminInst) {
          setInstitution(adminInst as InstitutionData);
          setIsAdmin(true);
          setIsStaff(false);
          setLoading(false);
          return;
        }

        // 2. Check if user is staff at an institution
        const { data: staffData } = await supabase
          .from('institution_staff')
          .select('institution_id')
          .eq('provider_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (staffData?.institution_id) {
          const { data: staffInst } = await supabase
            .from('healthcare_institutions')
            .select('*')
            .eq('id', staffData.institution_id)
            .single();

          if (staffInst) {
            setInstitution(staffInst as InstitutionData);
            setIsAdmin(false);
            setIsStaff(true);
            setLoading(false);
            return;
          }
        }

        setInstitution(null);
        setIsAdmin(false);
        setIsStaff(false);
      } catch (error) {
        console.error('Error fetching institution context:', error);
        setInstitution(null);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitution();
  }, [user]);

  return {
    institution,
    institutionId: institution?.id ?? null,
    isAdmin,
    isStaff,
    isAffiliated: isAdmin || isStaff,
    loading,
  };
}
