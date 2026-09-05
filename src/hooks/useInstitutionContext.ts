import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface InstitutionData {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_verified: boolean;
  admin_id: string;
  license_number?: string;
  operating_hours?: any;
  accepted_insurance_providers?: string[];
  currency?: string;
  created_at?: string;
  // New fields from migration 20260904_provider_institution_enhancements
  list_in_marketplace?: boolean;
  number_of_beds?: number;
  number_of_staff?: number;
  emergency_services?: boolean;
  ambulance_services?: boolean;
  is_24_7?: boolean;
  operational_since?: string;
  accreditation_body?: string;
  accreditation_number?: string;
  accreditation_expiry_date?: string;
  tax_id?: string;
  business_registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  swift_code?: string;
  services_offered?: string[];
  equipment_available?: string[];
  specialties?: string[];
  languages_spoken?: string[];
  // Location extras
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  status?: string;
}

/**
 * Unified, resilient hook for institution context across ALL roles.
 * Returns refreshInstitution as an alias for refetch for backward compatibility.
 */
export function useInstitutionContext() {
  const { user, profile } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInstitution = useCallback(async () => {
    if (!user) {
      setInstitution(null);
      setIsAdmin(false);
      setIsStaff(false);
      setLoading(false);
      return;
    }

    try {
      // 1. Check if user is admin/owner
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

      // 2. institution_staff
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
          .maybeSingle();

        if (staffInst) {
          setInstitution(staffInst as InstitutionData);
          setIsAdmin(false);
          setIsStaff(true);
          setLoading(false);
          return;
        }
      }

      // 3. pharmacy_staff
      const { data: pharmacyStaffData } = await (supabase as any)
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (pharmacyStaffData?.pharmacy_id) {
        const { data: pharmInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('id', pharmacyStaffData.pharmacy_id)
          .maybeSingle();

        if (pharmInst) {
          setInstitution(pharmInst as InstitutionData);
          setIsAdmin(false);
          setIsStaff(true);
          setLoading(false);
          return;
        }
      }

      // 4. institution_personnel
      const { data: personnelData } = await (supabase as any)
        .from('institution_personnel')
        .select('institution_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (personnelData?.institution_id) {
        const { data: pInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('id', personnelData.institution_id)
          .maybeSingle();

        if (pInst) {
          setInstitution(pInst as InstitutionData);
          setIsAdmin(false);
          setIsStaff(true);
          setLoading(false);
          return;
        }
      }

      // 5. Email match
      if (user.email) {
        const { data: emailInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (emailInst) {
          setInstitution(emailInst as InstitutionData);
          setIsAdmin(true);
          setIsStaff(false);
          setLoading(false);
          return;
        }
      }

      // 6. Auto-provisioning for institutional roles
      const userRole = (profile?.role || user.user_metadata?.role || '') as string;
      const businessType = (user.user_metadata?.business_type || '') as string;
      const isInstitutionalRole = [
        'pharmacy', 'pharmacist', 'hospital', 'clinic', 'specialized_clinic',
        'laboratory', 'lab', 'lab_technician', 'nursing_home', 'institution_admin',
        'institution_staff', 'health_personnel', 'doctor', 'nurse', 'radiologist',
        'phlebotomist', 'cxo', 'support', 'receptionist', 'hr_manager', 'billing_staff',
        'inventory_manager', 'maintenance_manager', 'specialist', 'ambulance_staff', 'pathologist',
      ].includes(userRole) || ['pharmacy', 'clinic', 'hospital', 'laboratory', 'nursing_home'].includes(businessType);

      if (isInstitutionalRole) {
        const institutionName =
          user.user_metadata?.business_name ||
          (profile?.first_name
            ? `${profile.first_name}'s Healthcare Practice`
            : "Doc' O Clock Healthcare Center");

        const determinedType =
          businessType ||
          (['pharmacy', 'pharmacist'].includes(userRole)
            ? 'pharmacy'
            : ['laboratory', 'lab', 'lab_technician', 'pathologist'].includes(userRole)
            ? 'laboratory'
            : ['nursing_home'].includes(userRole)
            ? 'nursing_home'
            : ['hospital'].includes(userRole)
            ? 'hospital'
            : 'clinic');

        const { data: newInst, error: insertError } = await supabase
          .from('healthcare_institutions')
          .insert({
            name: institutionName,
            type: determinedType as any,
            admin_id: user.id,
            is_verified: true,
            email: user.email || '',
            phone: profile?.phone || user.user_metadata?.phone || '+260 97 0000000',
            city: user.user_metadata?.city || profile?.city || 'Lusaka',
            country: user.user_metadata?.country || 'Zambia',
            currency: 'ZMW',
          })
          .select()
          .maybeSingle();

        if (!insertError && newInst) {
          await supabase.from('institution_staff').insert({
            institution_id: newInst.id,
            provider_id: user.id,
            role: userRole || 'admin',
            is_active: true,
          }).maybeSingle();

          setInstitution(newInst as InstitutionData);
          setIsAdmin(true);
          setIsStaff(false);
          setLoading(false);
          return;
        }

        // Fallback in-memory context
        const fallbackInst: InstitutionData = {
          id: user.id,
          name: institutionName,
          type: determinedType,
          admin_id: user.id,
          is_verified: true,
          email: user.email || '',
          phone: profile?.phone || user.user_metadata?.phone || '',
          city: user.user_metadata?.city || 'Lusaka',
          country: user.user_metadata?.country || 'Zambia',
          currency: 'ZMW',
        };

        setInstitution(fallbackInst);
        setIsAdmin(true);
        setIsStaff(false);
        setLoading(false);
        return;
      }

      setInstitution(null);
      setIsAdmin(false);
      setIsStaff(false);
    } catch (error) {
      console.error('Error in useInstitutionContext:', error);
      if (user) {
        setInstitution({
          id: user.id,
          name: "Doc' O Clock Healthcare",
          type: 'clinic',
          admin_id: user.id,
          is_verified: true,
          email: user.email || '',
          currency: 'ZMW',
        });
        setIsAdmin(true);
      } else {
        setInstitution(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchInstitution();
  }, [fetchInstitution]);

  return {
    institution,
    institutionId: institution?.id ?? null,
    isAdmin,
    isStaff,
    isAffiliated: isAdmin || isStaff || !!institution,
    loading,
    refetch: fetchInstitution,
    /** Alias for refetch — kept for backward compatibility with InstitutionSettings */
    refreshInstitution: fetchInstitution,
  };
}
