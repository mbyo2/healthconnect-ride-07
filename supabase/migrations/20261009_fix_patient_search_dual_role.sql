-- Fix search_patients_for_provider: dual-role users (e.g., doctor+patient) were
-- treated as patients and could not see any patients.
--
-- Bug (found 2026-10-09): the RPC checked "does caller have 'patient' role?"
-- and if yes, restricted them to seeing only themselves. But clinicians can
-- hold multiple roles (e.g., clin-doctor@doc0clock.qa has 'doctor', 'patient',
-- AND 'institution_admin'). Such users were trapped in the patient-only branch
-- and the clinical patient search returned zero results for them.
--
-- Fix: a caller is treated as "patient-only" ONLY if they have the patient
-- role AND have NO clinician/staff/admin role. Anyone with a clinical,
-- administrative, or support role gets the clinical branch (relationship-gated).

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_patient_only boolean;
BEGIN
  v_caller := auth.uid();

  -- Patient-only: has 'patient' role AND no clinician/staff/admin role.
  -- Dual-role users (doctor+patient, etc.) are clinicians, not patients-only.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller AND ur.role = 'patient'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller
    AND ur.role <> 'patient'
  ) INTO v_is_patient_only;

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
    NULL;
  END;

  -- Patient-only users: can ONLY see themselves (no enumeration)
  IF v_is_patient_only THEN
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
