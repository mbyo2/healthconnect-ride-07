-- Provider patient search function
-- Providers need to search for patients when writing prescriptions, ordering
-- labs, etc. Direct SELECT on profiles is blocked by RLS (patients can only
-- see their own). This SECURITY DEFINER function allows verified providers
-- to search patients by name/email.
--
-- Only returns basic identifying info, not medical data.

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE (
    p.first_name ILIKE '%' || p_search || '%'
    OR p.last_name ILIKE '%' || p_search || '%'
    OR p.email ILIKE '%' || p_search || '%'
  )
  AND EXISTS (
    -- Only verified providers can search
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN (
      'doctor', 'specialist', 'medical_licentiate', 'clinical_officer',
      'dentist', 'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife',
      'pharmacist', 'pharmacy_technologist', 'lab_technician', 'pathologist',
      'phlebotomist', 'radiologist'
    )
  )
  LIMIT 8;
$$;

COMMENT ON FUNCTION public.search_patients_for_provider(text) IS
  'Allows verified providers to search patients by name/email for clinical workflows (prescriptions, lab orders).';
