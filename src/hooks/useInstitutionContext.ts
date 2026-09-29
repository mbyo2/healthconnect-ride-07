import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface InstitutionData {
  id: string;
  name: string;
  type: string;
  /** Exact institution_types code chosen at signup (e.g. teaching_hospital).
   *  `type` is the coarse healthcare_provider_type enum value. */
  type_code?: string | null;
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

/** One institution the user is affiliated with, either as owner/admin or staff. */
export interface InstitutionAffiliation {
  id: string;
  name: string;
  type: string;
  /** admin = user owns the institution (admin_id); staff = active staff/member link */
  affiliation: 'admin' | 'staff';
  /** The staff role (e.g. pharmacist) when affiliation === 'staff'. */
  staffRole?: string | null;
}

const overrideKey = (userId: string) => `dococlock.active_institution.${userId}`;

/** Persisted "active institution" override, so staff with several affiliations
 *  (e.g. their own auto-provisioned pharmacy AND an employer's pharmacy they
 *  were invited to) can choose which workspace the app operates in. */
export function getActiveInstitutionOverride(userId: string): string | null {
  try {
    return localStorage.getItem(overrideKey(userId));
  } catch {
    return null;
  }
}

export function setActiveInstitutionOverride(userId: string, institutionId: string): void {
  try {
    localStorage.setItem(overrideKey(userId), institutionId);
  } catch {
    /* storage unavailable — override simply won't persist */
  }
}

export function clearActiveInstitutionOverride(userId: string): void {
  try {
    localStorage.removeItem(overrideKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * Unified, resilient hook for institution context across ALL roles.
 * Returns refreshInstitution as an alias for refetch for backward compatibility.
 *
 * Multi-affiliation support: when the user owns an institution AND is active
 * staff at another (e.g. a pharmacist invited to work at someone else's
 * pharmacy), `affiliations` lists every workspace and `switchInstitution`
 * moves the whole app into the chosen one. The choice persists per user.
 */
export function useInstitutionContext() {
  const { user, profile } = useAuth();
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [affiliations, setAffiliations] = useState<InstitutionAffiliation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyActive = useCallback(
    (
      affils: InstitutionAffiliation[],
      byId: Map<string, InstitutionData>,
      fallback: InstitutionData | null,
      fallbackIsAdmin: boolean,
    ) => {
      let activeId: string | null = null;
      if (user) {
        const stored = getActiveInstitutionOverride(user.id);
        if (stored && affils.some((a) => a.id === stored)) {
          activeId = stored;
        }
      }
      if (!activeId) {
        // Default: newest owned institution, else first staff affiliation —
        // preserves the historical single-workspace behaviour.
        activeId =
          affils.find((a) => a.affiliation === 'admin')?.id ??
          affils.find((a) => a.affiliation === 'staff')?.id ??
          null;
      }
      const activeAffil = affils.find((a) => a.id === activeId) ?? null;
      const activeInst = (activeId && byId.get(activeId)) || fallback;
      setInstitution(activeInst as InstitutionData | null);
      setAffiliations(affils);
      if (activeAffil) {
        setIsAdmin(activeAffil.affiliation === 'admin');
        setIsStaff(activeAffil.affiliation === 'staff');
      } else {
        setIsAdmin(fallbackIsAdmin);
        setIsStaff(false);
      }
      setLoading(false);
    },
    [user],
  );

  const fetchInstitution = useCallback(async () => {
    if (!user) {
      setInstitution(null);
      setAffiliations([]);
      setIsAdmin(false);
      setIsStaff(false);
      setLoading(false);
      return;
    }

    try {
      // 1. Institutions the user owns/admins (newest first).
      const { data: ownedInsts } = await supabase
        .from('healthcare_institutions')
        .select('*')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      const byId = new Map<string, InstitutionData>();
      const affils: InstitutionAffiliation[] = [];
      for (const inst of (ownedInsts as InstitutionData[] | null) || []) {
        byId.set(inst.id, inst);
        affils.push({ id: inst.id, name: inst.name, type: inst.type, affiliation: 'admin' });
      }

      // 2. Active institution_staff memberships.
      const { data: staffRows } = await supabase
        .from('institution_staff')
        .select('institution_id, role')
        .eq('provider_id', user.id)
        .eq('is_active', true);

      // 3. Legacy pharmacy_staff memberships.
      const { data: pharmacyStaffRows } = await (supabase as any)
        .from('pharmacy_staff')
        .select('pharmacy_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // 4. Legacy institution_personnel memberships.
      const { data: personnelRows } = await (supabase as any)
        .from('institution_personnel')
        .select('institution_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const staffInstIds = new Set<string>();
      const staffRoles = new Map<string, string | null>();
      for (const r of (staffRows as any[] | null) || []) {
        if (r?.institution_id && !byId.has(r.institution_id)) {
          staffInstIds.add(r.institution_id);
          if (!staffRoles.has(r.institution_id)) staffRoles.set(r.institution_id, r.role ?? null);
        }
      }
      for (const r of (pharmacyStaffRows as any[] | null) || []) {
        if (r?.pharmacy_id && !byId.has(r.pharmacy_id)) staffInstIds.add(r.pharmacy_id);
      }
      for (const r of (personnelRows as any[] | null) || []) {
        if (r?.institution_id && !byId.has(r.institution_id)) staffInstIds.add(r.institution_id);
      }

      if (staffInstIds.size > 0) {
        const { data: staffInsts } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .in('id', Array.from(staffInstIds));
        for (const inst of (staffInsts as InstitutionData[] | null) || []) {
          byId.set(inst.id, inst);
          affils.push({
            id: inst.id,
            name: inst.name,
            type: inst.type,
            affiliation: 'staff',
            staffRole: staffRoles.get(inst.id) ?? null,
          });
        }
      }

      if (affils.length > 0) {
        applyActive(affils, byId, null, false);
        return;
      }

      // 5. Email match (same multiples guard as step 1)
      if (user.email) {
        const { data: emailInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('email', user.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (emailInst) {
          const inst = emailInst as InstitutionData;
          applyActive(
            [{ id: inst.id, name: inst.name, type: inst.type, affiliation: 'admin' }],
            new Map([[inst.id, inst]]),
            null,
            true,
          );
          return;
        }
      }

      // 6. Auto-provisioning for institutional roles
      // (mirrors the taxonomy in roleConfig — any clinical, pharmacy, lab,
      // community or facility-operations role gets a workspace automatically).
      // NEVER auto-provision for 'support' (support agents must not own a
      // healthcare facility). Auto-provisioned rows are NOT verified —
      // accreditation is granted only through the institution application
      // review workflow.
      const userRole = (profile?.role || user.user_metadata?.role || '') as string;
      const businessType = (user.user_metadata?.business_type || '') as string;
      const isInstitutionalRole = [
        'pharmacy', 'wholesale_pharmacy', 'pharmacist', 'pharmacy_technologist',
        'hospital', 'clinic', 'specialized_clinic',
        'laboratory', 'lab', 'lab_technician', 'nursing_home', 'institution_admin',
        'institution_staff', 'medical_records_officer', 'health_personnel',
        'doctor', 'specialist', 'medical_licentiate', 'clinical_officer',
        'dentist', 'dental_therapist', 'nurse', 'registered_nurse', 'enrolled_nurse',
        'midwife', 'radiologist', 'radiographer', 'physiotherapist',
        'occupational_therapist', 'nutritionist', 'optometrist', 'psychologist',
        'environmental_health_officer', 'community_health_worker',
        'traditional_practitioner', 'phlebotomist', 'cxo',
        'receptionist', 'hr_manager', 'billing_staff',
        'inventory_manager', 'maintenance_manager', 'ambulance_staff', 'pathologist',
        'ot_staff', 'triage_staff',
      ].includes(userRole) || businessType.length > 0;

      if (isInstitutionalRole) {
        const institutionName =
          user.user_metadata?.business_name ||
          (profile?.first_name
            ? `${profile.first_name}'s Healthcare Practice`
            : "Doc' O Clock Healthcare Center");

        // Map to a valid healthcare_provider_type enum value. The DB enum only
        // accepts a fixed set; anything else fails the INSERT and the hook
        // falls back to a fake in-memory institution (which then breaks every
        // downstream RLS check, e.g. medication_inventory). This sanitizer
        // guarantees a valid value — new institution_types codes added later
        // only need a line here if they deserve better than the default.
        const VALID_INSTITUTION_TYPES = new Set([
          'doctor', 'nurse', 'hospital', 'clinic', 'pharmacy', 'nursing_home',
          'dentist', 'optician', 'dermatology_clinic', 'physiotherapy',
          'radiology_center', 'eye_clinic', 'skin_clinic', 'dental_clinic',
          'specialty_clinic', 'laboratory', 'wholesale_pharmacy',
        ]);
        const sanitizeInstitutionType = (raw: string): string => {
          const t = (raw || '').toLowerCase().trim();
          if (VALID_INSTITUTION_TYPES.has(t)) return t;
          if (t.includes('wholesale')) return 'wholesale_pharmacy';
          if (t.includes('pharm') || t.includes('drug') || t.includes('dispens') || t === 'health_shop') return 'pharmacy';
          if (t.includes('lab') || t.includes('blood')) return 'laboratory';
          if (t.includes('imaging') || t.includes('radiolog') || t.includes('diagnostic')) return 'radiology_center';
          if (t.includes('nursing') || t.includes('hospice') || t.includes('home_care') || t.includes('care_home')) return 'nursing_home';
          if (t.includes('dental')) return 'dental_clinic';
          if (t.includes('eye') || t.includes('opti')) return 'eye_clinic';
          if (t.includes('physio') || t.includes('rehab')) return 'physiotherapy';
          if (t.includes('dermat') || t.includes('skin')) return 'dermatology_clinic';
          if (t.includes('surg') || t.includes('trauma') || t.includes('theatre')) return 'hospital';
          if (t.includes('teach') || t.includes('universit') || t.includes('academic')) return 'hospital';
          if (t.includes('hospital')) return 'hospital';
          if (t.includes('maternity') || t.includes('cancer') || t.includes('cardiac') || t.includes('children') || t.includes('mental')) return 'specialty_clinic';
          return 'clinic';
        };

        const roleLower = userRole.toLowerCase();
        const btLower = businessType.toLowerCase();
        const rawType =
          businessType ||
          (['pharmacy', 'pharmacist', 'pharmacy_technologist'].includes(roleLower)
            ? 'pharmacy'
            : ['wholesale_pharmacy', 'wholesale'].includes(roleLower) || btLower.includes('wholesale')
            ? 'wholesale_pharmacy'
            : ['laboratory', 'lab', 'lab_technician', 'pathologist', 'phlebotomist'].includes(roleLower)
            ? 'laboratory'
            : roleLower.includes('imaging') || roleLower.includes('radiology')
            ? 'radiology_center'
            : ['nursing_home'].includes(roleLower)
            ? 'nursing_home'
            : ['hospital'].includes(roleLower)
            ? 'hospital'
            : 'clinic');
        const determinedType = sanitizeInstitutionType(rawType);

        // Re-check for an existing admin row immediately before inserting:
        // concurrent hook executions (or a retry after a slow insert) can
        // otherwise both pass step 1 and create duplicates.
        const { data: lateInst } = await supabase
          .from('healthcare_institutions')
          .select('*')
          .eq('admin_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lateInst) {
          const inst = lateInst as InstitutionData;
          applyActive(
            [{ id: inst.id, name: inst.name, type: inst.type, affiliation: 'admin' }],
            new Map([[inst.id, inst]]),
            null,
            true,
          );
          return;
        }

        const { data: newInst, error: insertError } = await supabase
          .from('healthcare_institutions')
          .insert({
            name: institutionName,
            type: determinedType as any,
            // Preserve the exact facility type chosen at signup so the
            // dashboard, module charter and staff roles can respond to it.
            // (rawType is the pre-sanitizer code, e.g. teaching_hospital.)
            type_code: (rawType || '').toLowerCase().trim() || null,
            admin_id: user.id,
            // Auto-provisioned rows are never pre-verified — verification is
            // granted only through the institution accreditation workflow.
            is_verified: false,
            email: user.email || '',
            phone: profile?.phone || user.user_metadata?.phone || '+260 97 0000000',
            city: user.user_metadata?.city || profile?.city || 'Lusaka',
            country: user.user_metadata?.country || 'Zambia',
            currency: 'ZMW',
          })
          .select()
          .maybeSingle();

        // Race guard: if a concurrent execution won the insert
        // (unique index on admin_id+name), adopt its row instead of falling
        // back to a fake in-memory institution.
        let provisioned = (!insertError && newInst ? (newInst as InstitutionData) : null);
        if (!provisioned && (insertError as any)?.code === '23505') {
          const { data: raceInst } = await supabase
            .from('healthcare_institutions')
            .select('*')
            .eq('admin_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (raceInst) provisioned = raceInst as InstitutionData;
        }

        if (provisioned) {
          await supabase.from('institution_staff').insert({
            institution_id: provisioned.id,
            provider_id: user.id,
            role: userRole || 'admin',
            is_active: true,
          }).maybeSingle();

          // Provision the HMS workspace in the background (idempotent —
          // no-op if departments already exist for this institution).
          // Pass the precise type code so department seeding matches the
          // exact facility kind chosen at signup.
          const { provisionInstitutionWorkspace } = await import('@/services/institutionProvisioning');
          provisionInstitutionWorkspace(provisioned.id, (provisioned as InstitutionData).type_code || (provisioned as InstitutionData).type).then(() => {}).catch(() => {});

          applyActive(
            [{ id: provisioned.id, name: provisioned.name, type: provisioned.type, affiliation: 'admin' }],
            new Map([[provisioned.id, provisioned]]),
            null,
            true,
          );
          return;
        }

        // Fallback in-memory context
        const fallbackInst: InstitutionData = {
          id: user.id,
          name: institutionName,
          type: determinedType,
          type_code: (rawType || '').toLowerCase().trim() || null,
          admin_id: user.id,
          is_verified: false,
          email: user.email || '',
          phone: profile?.phone || user.user_metadata?.phone || '',
          city: user.user_metadata?.city || 'Lusaka',
          country: user.user_metadata?.country || 'Zambia',
          currency: 'ZMW',
        };

        setInstitution(fallbackInst);
        setAffiliations([]);
        setIsAdmin(true);
        setIsStaff(false);
        setLoading(false);
        return;
      }

      setInstitution(null);
      setAffiliations([]);
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
        setAffiliations([]);
        setIsAdmin(true);
      } else {
        setInstitution(null);
        setAffiliations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, profile, applyActive]);

  useEffect(() => {
    fetchInstitution();
  }, [fetchInstitution]);

  /** Move the whole app into another affiliated institution. Persists per user. */
  const switchInstitution = useCallback(
    (institutionId: string) => {
      if (!user) return;
      setActiveInstitutionOverride(user.id, institutionId);
      // Re-resolve from the stored override so every consumer updates.
      fetchInstitution();
    },
    [user, fetchInstitution],
  );

  return {
    institution,
    institutionId: institution?.id ?? null,
    /** Every workspace the user can operate in (owned + staff). */
    affiliations,
    /** Switch the active workspace; persists per user. */
    switchInstitution,
    isAdmin,
    isStaff,
    isAffiliated: isAdmin || isStaff || !!institution,
    loading,
    refetch: fetchInstitution,
    /** Alias for refetch — kept for backward compatibility with InstitutionSettings */
    refreshInstitution: fetchInstitution,
  };
}
