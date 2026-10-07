-- SECURITY DEFINER function for institution appointment lists with names
--
-- CONTEXT (2026-10-07): the institution appointments page needs patient and
-- provider names alongside each appointment. Joining profiles directly trips
-- profiles RLS (receptionists are not appointment participants), and adding a
-- profiles SELECT policy for institution staff caused intermittent
-- "Failed to load appointments" query failures (RLS evaluation interacting
-- with the join). This function sidesteps the issue: it runs as postgres
-- (SECURITY DEFINER), enforces the caller-is-staff-or-admin check up front,
-- and returns appointments with denormalized names.
--
-- Matches appointments by provider affiliation (staff/personnel) OR direct
-- institution_id linkage (set at booking time by
-- trg_set_appointment_institution).

CREATE OR REPLACE FUNCTION public.get_institution_appointments(p_institution_id uuid)
RETURNS TABLE (
  id uuid,
  appointment_date date,
  appointment_time text,
  status text,
  appointment_type text,
  patient_id uuid,
  patient_first_name text,
  patient_last_name text,
  patient_email text,
  provider_id uuid,
  provider_first_name text,
  provider_last_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Caller must be staff or admin of this institution (or platform admin)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.institution_id = p_institution_id
        AND s.provider_id = auth.uid()
        AND s.is_active
    )
    OR EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized for this institution';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.appointment_type,
    a.patient_id,
    pat.first_name,
    pat.last_name,
    pat.email,
    a.provider_id,
    prov.first_name,
    prov.last_name,
    a.created_at
  FROM public.appointments a
  LEFT JOIN public.profiles pat ON pat.id = a.patient_id
  LEFT JOIN public.profiles prov ON prov.id = a.provider_id
  WHERE a.institution_id = p_institution_id
     OR a.provider_id IN (
       SELECT s.provider_id FROM public.institution_staff s
       WHERE s.institution_id = p_institution_id AND s.is_active
     )
     OR a.provider_id IN (
       SELECT p.user_id FROM public.institution_personnel p
       WHERE p.institution_id = p_institution_id
     )
  ORDER BY a.appointment_date DESC, a.appointment_time DESC;
END;
$function$;

COMMENT ON FUNCTION public.get_institution_appointments(uuid) IS
  'Returns institution appointments with patient/provider names. SECURITY DEFINER to avoid profiles RLS join issues; enforces staff/admin authorization internally.';
