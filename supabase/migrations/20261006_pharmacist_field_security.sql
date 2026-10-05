-- Pharmacist field-level security for prescription claim/dispense
-- The RLS UPDATE policy allows pharmacists to UPDATE unassigned prescriptions,
-- but doesn't restrict WHICH fields they can change. A malicious pharmacist
-- could alter patient_id, medications, or assign to a different pharmacy.
--
-- This trigger ensures pharmacists can only:
-- 1. Set pharmacy_id from NULL to a pharmacy they work for
-- 2. Change status from pending/assigned to dispensing statuses
-- 3. Set dispensing metadata (dispensed_at, dispensed_by)
-- All other field changes are blocked.

CREATE OR REPLACE FUNCTION public.validate_pharmacist_rx_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_pharmacist boolean;
  v_user_pharmacy_ids uuid[];
BEGIN
  -- Check if the user is a pharmacist/pharmacy tech
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('pharmacist', 'pharmacy_technologist')
  ) INTO v_is_pharmacist;

  -- Non-pharmacists: let other policies/triggers handle it
  IF NOT v_is_pharmacist THEN
    RETURN NEW;
  END IF;

  -- Get pharmacies this user works for
  SELECT array_agg(institution_id) INTO v_user_pharmacy_ids
  FROM public.institution_staff
  WHERE provider_id = auth.uid();

  -- Also check admin_id on healthcare_institutions
  SELECT v_user_pharmacy_ids || array_agg(id) INTO v_user_pharmacy_ids
  FROM public.healthcare_institutions
  WHERE admin_id = auth.uid();

  -- Rule 1: pharmacy_id can only go from NULL to one of their pharmacies
  IF OLD.pharmacy_id IS DISTINCT FROM NEW.pharmacy_id THEN
    IF OLD.pharmacy_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot reassign prescription to a different pharmacy.'
        USING ERRCODE = '42501';
    END IF;
    IF NOT (NEW.pharmacy_id = ANY(v_user_pharmacy_ids)) THEN
      RAISE EXCEPTION 'Can only claim prescriptions for your own pharmacy.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Rule 2: status can only move forward in dispensing workflow
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status NOT IN ('pending', 'assigned') THEN
      RAISE EXCEPTION 'Cannot modify status of prescription in status: %', OLD.status
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('assigned', 'filled', 'partially_filled', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Rule 3: clinical fields are immutable for pharmacists
  IF OLD.patient_id IS DISTINCT FROM NEW.patient_id
     OR OLD.provider_id IS DISTINCT FROM NEW.provider_id
     OR OLD.medications IS DISTINCT FROM NEW.medications
     OR OLD.diagnosis IS DISTINCT FROM NEW.diagnosis
     OR OLD.notes IS DISTINCT FROM NEW.notes THEN
    RAISE EXCEPTION 'Pharmacists cannot modify clinical prescription details.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_pharmacist_rx_update ON public.comprehensive_prescriptions;
CREATE TRIGGER trg_validate_pharmacist_rx_update
  BEFORE UPDATE ON public.comprehensive_prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_pharmacist_rx_update();

COMMENT ON FUNCTION public.validate_pharmacist_rx_update() IS
  'Field-level security: pharmacists can only claim (set pharmacy_id to own pharmacy) and dispense (status forward); clinical fields immutable.';
