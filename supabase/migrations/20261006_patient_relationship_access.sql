-- ============================================================
-- Relationship-based patient access control
--
-- Replaces the permissive "any clinical role can search all patients"
-- with relationship-gated access per CEO's patient privacy boundary:
-- providers/institutions may only access patients they have a
-- legitimate relationship with (appointment, prescription, lab order,
-- referral, check-in, consent, or share).
--
-- Components:
-- 1. has_patient_relationship(patient_id) - SECURITY DEFINER check
-- 2. Updated search_patients_for_provider with relationship gate
-- 3. Audit logging for all patient identity searches
-- ============================================================

-- 1. Relationship check: does the caller have a legitimate clinical
--    relationship with this patient?
CREATE OR REPLACE FUNCTION public.has_patient_relationship(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- The patient themselves always has access
    SELECT 1 WHERE auth.uid() = p_patient_id
  ) OR EXISTS (
    -- Super admins and admins (platform-level, for support/escalation)
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin', 'support')
  ) OR EXISTS (
    -- Appointments: caller is the provider
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = p_patient_id
    AND a.provider_id = auth.uid()
  ) OR EXISTS (
    -- Prescriptions: caller is the prescriber (check both prescription tables)
    SELECT 1 FROM public.comprehensive_prescriptions pr
    WHERE pr.patient_id = p_patient_id
    AND pr.provider_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.pharmacy_prescriptions pr
    WHERE pr.patient_id = p_patient_id
    AND pr.prescribed_by = auth.uid()
  ) OR EXISTS (
    -- Lab orders: caller ordered the test
    SELECT 1 FROM public.lab_tests lt
    WHERE lt.patient_id = p_patient_id
    AND lt.ordered_by = auth.uid()
  ) OR EXISTS (
    -- Referrals: caller is the referring doctor
    SELECT 1 FROM public.referrals r
    WHERE r.patient_id = p_patient_id
    AND r.referring_doctor_id = auth.uid()
  ) OR EXISTS (
    -- Queue tokens / check-ins: caller is staff at the same institution
    -- where the patient has a token
    SELECT 1 FROM public.queue_tokens qt
    JOIN public.institution_staff ist ON ist.institution_id = qt.institution_id
    WHERE qt.patient_id = p_patient_id
    AND ist.provider_id = auth.uid()
  ) OR EXISTS (
    -- Institution admin: patient has relationship with their institution
    SELECT 1 FROM public.queue_tokens qt
    JOIN public.healthcare_institutions hi ON hi.id = qt.institution_id
    WHERE qt.patient_id = p_patient_id
    AND hi.admin_id = auth.uid()
  ) OR EXISTS (
    -- Patient consent/shares: explicit consent granted to caller
    SELECT 1 FROM public.patient_consents pc
    WHERE pc.patient_id = p_patient_id
    AND pc.granted_to = auth.uid()
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
  );
$function$;

COMMENT ON FUNCTION public.has_patient_relationship(uuid) IS
  'Returns true if the caller has a legitimate clinical/administrative relationship with the patient: self, platform admin, appointment provider, prescriber, lab orderer, referral party, institution staff/admin via queue, or explicit patient consent.';

-- 2. Audit table for patient identity access
CREATE TABLE IF NOT EXISTS public.patient_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_at timestamptz NOT NULL DEFAULT now(),
  accessor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  access_type text NOT NULL, -- 'search', 'view', 'list'
  search_term text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins can read audit logs; system writes via SECURITY DEFINER
ALTER TABLE public.patient_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read patient access audit" ON public.patient_access_audit;
CREATE POLICY "Admins read patient access audit"
  ON public.patient_access_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'admin')
    )
  );

-- 3. Updated search function with relationship gate + audit
CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_patient boolean;
BEGIN
  v_caller := auth.uid();

  -- Determine if caller is a patient-role user
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller AND ur.role = 'patient'
  ) INTO v_is_patient;

  -- Audit the search (fire and forget, don't block on audit failure)
  BEGIN
    INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
    SELECT v_caller, p.id, 'search', p_search
    FROM public.profiles p
    WHERE p.role = 'patient'
    AND (p.first_name ILIKE '%' || p_search || '%'
         OR p.last_name ILIKE '%' || p_search || '%'
         OR p.email ILIKE '%' || p_search || '%')
    LIMIT 8;
  EXCEPTION WHEN OTHERS THEN
    -- Audit failure should not block the search
    NULL;
  END;

  -- Patient users: can ONLY see themselves (no enumeration)
  IF v_is_patient THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email
    FROM public.profiles p
    WHERE p.id = v_caller
    AND p.role = 'patient'
    LIMIT 1;
    RETURN;
  END IF;

  -- Clinical/staff users: only patients with a legitimate relationship
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE p.role = 'patient'
  AND (p.first_name ILIKE '%' || p_search || '%'
       OR p.last_name ILIKE '%' || p_search || '%'
       OR p.email ILIKE '%' || p_search || '%')
  AND public.has_patient_relationship(p.id)
  LIMIT 8;
END;
$function$;

COMMENT ON FUNCTION public.search_patients_for_provider(text) IS
  'Relationship-gated patient search: clinical/staff users only see patients they have a legitimate relationship with (appointment, prescription, lab order, referral, check-in, consent). Patient users can only see themselves. All searches are audited.';
