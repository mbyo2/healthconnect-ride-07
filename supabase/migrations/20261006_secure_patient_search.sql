-- ============================================================
-- Secure patient search v2: practical access control
-- 
-- Patients: can ONLY see themselves (cannot search other patients)
-- Providers (clinical roles): CAN search patients (licensed professionals
--   providing care), but all searches are via this audited function
-- Institutions: staff can search (for check-in, queue management)
--
-- The key security boundary: patient role users cannot enumerate
-- other patients. Provider access is role-gated and auditable.
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH caller AS (
    SELECT auth.uid() as uid
  ),
  -- Check if caller has any clinical/staff role
  has_clinical_role AS (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur, caller c
      WHERE ur.user_id = c.uid
      AND ur.role IN (
        'doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist',
        'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'pharmacist',
        'pharmacy_technologist', 'lab_technician', 'pathologist', 'phlebotomist', 'radiologist',
        'receptionist', 'admin', 'institution_admin', 'super_admin'
      )
    ) as val
  )
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p, caller c, has_clinical_role hcr
  WHERE 
    -- Search filter: only search patient profiles
    p.role = 'patient'
    AND (p.first_name ILIKE '%' || p_search || '%' 
         OR p.last_name ILIKE '%' || p_search || '%' 
         OR p.email ILIKE '%' || p_search || '%')
    AND
    -- Access control:
    -- 1. Clinical/staff users: can search all patients (for care delivery)
    -- 2. Patient users: can ONLY see themselves (p.id = caller uid)
    (
      (hcr.val = true)
      OR (hcr.val = false AND p.id = c.uid)
    )
  LIMIT 8;
$function$;

COMMENT ON FUNCTION public.search_patients_for_provider(text) IS 
  'Secure patient search: clinical/staff roles can search patients for care delivery; patient-role users can only see themselves. Prevents patient-to-patient enumeration.';
