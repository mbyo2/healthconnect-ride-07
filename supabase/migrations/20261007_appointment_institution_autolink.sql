-- Auto-link appointments to the provider's institution
--
-- BUG (found 2026-10-07 via live receptionist test): bookings insert
-- appointments with institution_id = NULL. Institution-scoped staff views
-- (receptionist appointments, queue desk) filter by institution_id, so
-- booked appointments are invisible to the clinic's own receptionist —
-- the only check-in path becomes re-typing the patient as a walk-in.
--
-- FIX: BEFORE INSERT trigger that resolves the provider's institution
-- (own auto-provisioned practice first, then staff linkage) and sets
-- NEW.institution_id when the booking did not specify one.

CREATE OR REPLACE FUNCTION public.set_appointment_institution_from_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_institution_id uuid;
BEGIN
  IF NEW.institution_id IS NULL AND NEW.provider_id IS NOT NULL THEN
    -- 1. Provider's own auto-provisioned practice
    SELECT id INTO v_institution_id
    FROM public.healthcare_institutions
    WHERE admin_id = NEW.provider_id
    ORDER BY created_at ASC
    LIMIT 1;

    -- 2. Fall back to staff linkage
    IF v_institution_id IS NULL THEN
      SELECT institution_id INTO v_institution_id
      FROM public.institution_staff
      WHERE provider_id = NEW.provider_id
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    NEW.institution_id := v_institution_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_appointment_institution ON public.appointments;
CREATE TRIGGER trg_set_appointment_institution
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_appointment_institution_from_provider();

COMMENT ON FUNCTION public.set_appointment_institution_from_provider() IS
  'Auto-links booked appointments to the provider''s institution so institution staff (receptionists) can see and check in booked patients.';

-- Backfill: link existing NULL-institution appointments to their provider's institution
UPDATE public.appointments a
SET institution_id = (
  SELECT hi.id
  FROM public.healthcare_institutions hi
  WHERE hi.admin_id = a.provider_id
  ORDER BY hi.created_at ASC
  LIMIT 1
)
WHERE a.institution_id IS NULL
  AND a.provider_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.admin_id = a.provider_id
  );
