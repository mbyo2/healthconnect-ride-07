-- F-13 follow-up — the INSERT gate already existed; reschedules (UPDATE of
-- slot fields) bypassed it, allowing double-booking by moving an
-- appointment onto an occupied slot; status-only updates are never blocked
-- (in-function short-circuit).
--
-- Extends public.enforce_provider_availability() to UPDATEs of the slot
-- fields on public.appointments. The function body below is the verified
-- live definition, preserved exactly except for the UPDATE short-circuit
-- at the top of the body:
--   * Slot identity unchanged (provider_id / date / time /
--     appointment_date / appointment_time all NOT DISTINCT FROM OLD)
--     -> RETURN NEW, so status edits, notes, fee pinning etc. are never
--     blocked by this gate.
--   * New status not in ('pending', 'scheduled', 'confirmed')
--     -> RETURN NEW: moving a row OUT of an occupying status frees the
--     slot and must never be blocked.

CREATE OR REPLACE FUNCTION public.enforce_provider_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_date date;
  v_time time;
  v_app_dow int;
  v_has_availability boolean;
  v_within_hours boolean;
BEGIN
  -- UPDATE short-circuit: slot identity unchanged -> never block.
  IF TG_OP = 'UPDATE'
    AND NEW.provider_id IS NOT DISTINCT FROM OLD.provider_id
    AND NEW.date IS NOT DISTINCT FROM OLD.date
    AND NEW.time IS NOT DISTINCT FROM OLD.time
    AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
    AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NEW;
  END IF;

  -- UPDATE short-circuit: moving out of an occupying status frees the slot.
  IF TG_OP = 'UPDATE' AND NEW.status NOT IN ('pending', 'scheduled', 'confirmed') THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_date := COALESCE(NEW.appointment_date::date, NEW.date::date);
    v_time := COALESCE(NEW.appointment_time::time, NEW.time::time);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_date IS NULL OR v_time IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text || '|' || v_date::text || '|' || v_time::text, 0));

  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.provider_id = NEW.provider_id AND COALESCE(a.appointment_date::date, a.date::date) = v_date AND COALESCE(a.appointment_time::time, a.time::time) = v_time AND a.status IN ('pending', 'scheduled', 'confirmed') AND a.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION 'This time slot is already booked. Please choose another time.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id) INTO v_has_availability;

  IF NOT v_has_availability THEN
    RETURN NEW;
  END IF;

  v_app_dow := (EXTRACT(DOW FROM v_date)::int + 6) % 7;

  SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id AND ((pa.specific_date IS NOT NULL AND pa.specific_date::date = v_date) OR (COALESCE(pa.is_recurring, true) AND pa.specific_date IS NULL AND pa.day_of_week = v_app_dow)) AND v_time >= pa.start_time::time AND v_time < pa.end_time::time AND (pa.break_start IS NULL OR pa.break_end IS NULL OR v_time < pa.break_start::time OR v_time >= pa.break_end::time)) INTO v_within_hours;

  IF NOT v_within_hours THEN
    RAISE EXCEPTION 'The selected time is outside this provider''s working hours.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_provider_availability ON public.appointments;
CREATE TRIGGER trg_enforce_provider_availability
  BEFORE INSERT OR UPDATE OF provider_id, date, time, appointment_date, appointment_time ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_provider_availability();
