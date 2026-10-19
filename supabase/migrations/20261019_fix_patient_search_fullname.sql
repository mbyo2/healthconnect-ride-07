-- Fix patient search to handle full names (first + last)
-- Add concatenated name matching

CREATE OR REPLACE FUNCTION public.search_patients_for_provider(p_search text)
RETURNS TABLE(id uuid, first_name text, last_name text, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_is_patient boolean;
BEGIN
  v_caller := auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_caller AND ur.role = 'patient'
  ) INTO v_is_patient;

  BEGIN
    INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term)
    SELECT v_caller, p.id, 'search', p_search
    FROM public.profiles p
    WHERE p.role = 'patient'
    AND (p.first_name ILIKE '%' || p_search || '%'
         OR p.last_name ILIKE '%' || p_search || '%'
         OR (p.first_name || ' ' || p.last_name) ILIKE '%' || p_search || '%'
         OR p.email ILIKE '%' || p_search || '%')
    LIMIT 8;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  IF v_is_patient THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email
    FROM public.profiles p
    WHERE p.id = v_caller
    AND p.role = 'patient'
    LIMIT 1;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE p.role = 'patient'
  AND (p.first_name ILIKE '%' || p_search || '%'
       OR p.last_name ILIKE '%' || p_search || '%'
       OR (p.first_name || ' ' || p.last_name) ILIKE '%' || p_search || '%'
       OR p.email ILIKE '%' || p_search || '%')
  AND public.has_patient_relationship(p.id)
  LIMIT 8;
END;
$function$;
