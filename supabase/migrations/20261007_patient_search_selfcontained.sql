-- Self-contained relationship-gated patient search.
-- Inlines all relationship checks so the function has ZERO dependencies
-- on other custom functions or tables. Previous version depended on
-- public.has_patient_relationship(); if that helper was missing or broken
-- live, every search raised "function does not exist" and the UI showed
-- empty results. This version cannot fail that way.
--
-- Access rules (per CEO patient-privacy boundary):
--  - patient-role callers: only their own row (no enumeration)
--  - clinical/staff callers: only patients with a legitimate relationship
--    (appointment, prescription, lab order, referral, or platform admin/support)

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_patient boolean;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN; -- unauthenticated: no results
  END IF;

  -- Is the caller a patient-role user? (explicit patient role only;
  -- clinical users may also carry a patient row from signup triggers)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller AND ur.role = 'patient'
  ) INTO v_is_patient;

  -- Best-effort audit: only if the audit table exists, never block search
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'patient_access_audit'
    ) THEN
      INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
      SELECT v_caller, p.id, 'search', p_search
      FROM public.profiles p
      WHERE p.role = 'patient'
      AND (p.first_name ILIKE '%' || p_search || '%'
           OR p.last_name ILIKE '%' || p_search || '%'
           OR p.email ILIKE '%' || p_search || '%')
      LIMIT 8;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- audit must never break search
  END;

  -- Patient users: only themselves, no enumeration of other patients
  IF v_is_patient THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email
    FROM public.profiles p
    WHERE p.id = v_caller
    AND (p.first_name ILIKE '%' || p_search || '%'
         OR p.last_name ILIKE '%' || p_search || '%'
         OR p.email ILIKE '%' || p_search || '%')
    LIMIT 8;
    RETURN;
  END IF;

  -- Clinical / staff / admin users: only patients with a real relationship
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE p.role = 'patient'
  AND (p.first_name ILIKE '%' || p_search || '%'
       OR p.last_name ILIKE '%' || p_search || '%'
       OR p.email ILIKE '%' || p_search || '%')
  AND (
    -- platform admin / support (escalation path)
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_caller
      AND ur.role IN ('super_admin', 'admin', 'support')
    )
    -- appointment: caller is the provider
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = p.id AND a.provider_id = v_caller
    )
    -- prescription: caller is the prescriber
    OR EXISTS (
      SELECT 1 FROM public.comprehensive_prescriptions pr
      WHERE pr.patient_id = p.id AND pr.provider_id = v_caller
    )
    -- lab order: caller ordered the test
    OR EXISTS (
      SELECT 1 FROM public.lab_tests lt
      WHERE lt.patient_id = p.id AND lt.ordered_by = v_caller
    )
    -- referral: caller is the referring doctor
    OR EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.patient_id = p.id AND r.referring_doctor_id = v_caller
    )
    -- check-in: caller is staff/admin of the institution the patient visited
    OR EXISTS (
      SELECT 1 FROM public.queue_tokens qt
      WHERE qt.patient_id = p.id
      AND (
        qt.institution_id IN (
          SELECT ist.institution_id FROM public.institution_staff ist
          WHERE ist.provider_id = v_caller
        )
        OR qt.institution_id IN (
          SELECT hi.id FROM public.healthcare_institutions hi
          WHERE hi.admin_id = v_caller
        )
      )
    )
  )
  LIMIT 8;
END;
$function$;

COMMENT ON FUNCTION public.search_patients_for_provider(text) IS
  'Relationship-gated patient search (self-contained, no helper dependencies): clinical/staff users only see patients they have a legitimate relationship with (appointment, prescription, lab order, referral, check-in). Patient users can only see themselves. Audit is best-effort.';
