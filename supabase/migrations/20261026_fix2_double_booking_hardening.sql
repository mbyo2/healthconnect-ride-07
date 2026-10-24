-- Fix 2: double-booking hardening
-- (a) enforce_provider_availability: 'pending' is the status every new booking
--     is created with, but the occupancy EXISTS check omitted it, so pending
--     bookings did not block the slot in this trigger. Status set is now
--     ('pending','scheduled','confirmed'). An advisory transaction lock on
--     provider|date|time is taken immediately before the occupancy check
--     (after v_date/v_time are computed and the null guard) so concurrent
--     inserts for the same provider+slot are serialized, the occupancy check
--     itself is race-proof, and the loser receives this function's
--     plain-language exception ('This time slot is already booked. Please
--     choose another time.') instead of a raw unique-violation.
--     Availability-hours logic below is untouched.
-- (b) normalize_appointment_slot_time: the partial unique index
--     idx_appointments_no_double_book compares time as TEXT, so '9:00' and
--     '09:00' would otherwise be different keys. Normalize NEW.time and
--     NEW.appointment_time to canonical 'HH24:MI' on INSERT/UPDATE.
-- (c) get_provider_booked_slots: held (pending) slots render as occupied,
--     consistent with the unique index; status set matches (a).
CREATE OR REPLACE FUNCTION public.enforce_provider_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_date date; v_time time; v_app_dow int; v_has_availability boolean; v_within_hours boolean; BEGIN BEGIN v_date := COALESCE(NEW.appointment_date::date, NEW.date::date); v_time := COALESCE(NEW.appointment_time::time, NEW.time::time); EXCEPTION WHEN OTHERS THEN RETURN NEW; END; IF v_date IS NULL OR v_time IS NULL THEN RETURN NEW; END IF; PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text || '|' || v_date::text || '|' || v_time::text, 0)); IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.provider_id = NEW.provider_id AND COALESCE(a.appointment_date::date, a.date::date) = v_date AND COALESCE(a.appointment_time::time, a.time::time) = v_time AND a.status IN ('pending', 'scheduled', 'confirmed') AND a.id IS DISTINCT FROM NEW.id) THEN RAISE EXCEPTION 'This time slot is already booked. Please choose another time.'; END IF; SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id) INTO v_has_availability; IF NOT v_has_availability THEN RETURN NEW; END IF; v_app_dow := (EXTRACT(DOW FROM v_date)::int + 6) % 7; SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id AND ((pa.specific_date IS NOT NULL AND pa.specific_date::date = v_date) OR (COALESCE(pa.is_recurring, true) AND pa.specific_date IS NULL AND pa.day_of_week = v_app_dow)) AND v_time >= pa.start_time::time AND v_time < pa.end_time::time AND (pa.break_start IS NULL OR pa.break_end IS NULL OR v_time < pa.break_start::time OR v_time >= pa.break_end::time)) INTO v_within_hours; IF NOT v_within_hours THEN RAISE EXCEPTION 'The selected time is outside this provider''s working hours.'; END IF; RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.normalize_appointment_slot_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.time IS NOT NULL THEN
    BEGIN
      NEW.time := to_char(NEW.time::time, 'HH24:MI');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  IF NEW.appointment_time IS NOT NULL THEN
    BEGIN
      NEW.appointment_time := to_char(NEW.appointment_time::time, 'HH24:MI');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_appointment_slot_time ON public.appointments;

CREATE TRIGGER trg_normalize_appointment_slot_time
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.normalize_appointment_slot_time();

CREATE OR REPLACE FUNCTION public.get_provider_booked_slots(p_ids uuid[], p_from date, p_to date)
 RETURNS TABLE(provider_id uuid, slot_date date, slot_time time without time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT a.provider_id, a.date, a.time::time FROM public.appointments a WHERE a.provider_id=ANY(p_ids) AND a.status IN ('pending','scheduled','confirmed') AND a.date>=p_from AND a.date<=p_to $function$;
