-- Self-contained relationship-gated patient search (v2).
--
-- v2 fix: caller classification. The signup trigger grants EVERY new auth
-- user a 'patient' row in user_roles, so testing "caller HAS patient role"
-- misclassifies doctors (and all clinical staff) as patients — they fell
-- into the patient-only branch and could only see themselves. Verified live
-- 2026-10-06: a doctor searching "QAX39" got their OWN profile back instead
-- of their linked patient.
--
-- Correct rule: a caller is clinical/staff iff they hold ANY non-patient
-- role. Only callers with no non-patient role get the patient-only branch.
--
-- Access rules (per CEO patient-privacy boundary):
--  - patient-only callers: only their own row (no enumeration)
--  - clinical/staff callers: only patients with a legitimate relationship
--    (appointment, prescription, lab order, referral, check-in,
--     or platform admin/support)

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_clinical boolean;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN; -- unauthenticated: no results
  END IF;

  -- Clinical/staff = holds ANY role other than 'patient'.
  -- (Signup triggers give everyone a patient role, so the mere presence
  -- of a patient role proves nothing.)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller AND ur.role <> 'patient'
  ) INTO v_is_clinical;

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

  -- Patient-only callers: themselves only, no enumeration of other patients
  IF NOT v_is_clinical THEN
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

  -- Clinical / staff / admin callers: only patients with a real relationship
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
  'Relationship-gated patient search (self-contained v2): clinical/staff = any non-patient role (signup triggers grant everyone a patient role). Clinical callers only see patients with a legitimate relationship. Patient-only callers see just themselves. Audit is best-effort.';
