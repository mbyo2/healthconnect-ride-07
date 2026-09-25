-- ============================================================
-- Doc'O Clock — server-side booking guards on appointments
--
-- The booking UI only disabled exact date+time collisions; nothing
-- stopped a booking outside a provider's working hours, and a crafted
-- request could double-book a slot. This trigger enforces both,
-- atomically, for every write path (modal, API, admin).
--
-- Design notes:
-- * Permissive default: providers who never configured working hours
--   are NOT blocked — the hours check only applies when the provider
--   has provider_availability rows.
-- * Day-of-week follows the app's AvailabilityManager convention:
--   0=Monday … 6=Sunday (Postgres DOW is 0=Sunday, hence the shift).
-- * Break windows are respected; specific_date overrides recurring rows.
-- * Idempotent; safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_provider_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_time time;
  v_app_dow int;
  v_has_availability boolean;
  v_within_hours boolean;
BEGIN
  -- Canonical date/time (legacy date/time vs appointment_date/appointment_time)
  BEGIN
    v_date := COALESCE(NEW.appointment_date::date, NEW.date::date);
    v_time := COALESCE(NEW.appointment_time::time, NEW.time::time);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- unparseable values: leave to other validation
  END;

  IF v_date IS NULL OR v_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- 1. Exact-slot double-book guard (matches the UI's booked-slot logic)
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.provider_id = NEW.provider_id
      AND COALESCE(a.appointment_date::date, a.date::date) = v_date
      AND COALESCE(a.appointment_time::time, a.time::time) = v_time
      AND a.status IN ('scheduled', 'confirmed')
      AND a.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'This time slot is already booked. Please choose another time.';
  END IF;

  -- 2. Working-hours enforcement, only for providers who configured hours
  SELECT EXISTS (
    SELECT 1 FROM public.provider_availability pa
    WHERE pa.provider_id = NEW.provider_id
  ) INTO v_has_availability;

  IF NOT v_has_availability THEN
    RETURN NEW;
  END IF;

  -- App convention: 0=Monday … 6=Sunday
  v_app_dow := (EXTRACT(DOW FROM v_date)::int + 6) % 7;

  SELECT EXISTS (
    SELECT 1 FROM public.provider_availability pa
    WHERE pa.provider_id = NEW.provider_id
      AND (
        (pa.specific_date IS NOT NULL AND pa.specific_date::date = v_date)
        OR (COALESCE(pa.is_recurring, true) AND pa.specific_date IS NULL AND pa.day_of_week = v_app_dow)
      )
      AND v_time >= pa.start_time::time
      AND v_time < pa.end_time::time
      AND (
        pa.break_start IS NULL OR pa.break_end IS NULL
        OR v_time < pa.break_start::time OR v_time >= pa.break_end::time
      )
  ) INTO v_within_hours;

  IF NOT v_within_hours THEN
    RAISE EXCEPTION 'The selected time is outside this provider''s working hours.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_provider_availability ON public.appointments;
CREATE TRIGGER trg_enforce_provider_availability
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_provider_availability();
