-- Public slot-occupancy lookup for booking UIs (2026-10-09).
--
-- Problem: the "Nearest available slots" chips, the search result "Next free"
-- chip, and the booking modal's booked-slot grid all queried public.appointments
-- directly. The appointments SELECT policy only reveals a user's OWN rows
-- (auth.uid() = patient_id OR auth.uid() = provider_id), so a patient could
-- never see other patients' booked times: every slot looked free and
-- double-booking was one tap away.
--
-- Fix: a SECURITY DEFINER function (same pattern as user_shares_appointment_with
-- and the other RLS-bypass helpers) that returns ONLY slot occupancy —
-- provider_id, date, time — for scheduled/confirmed appointments in a window.
-- No patient identities, notes, or fees ever leave the database through it.
-- The window parameters keep callers from scraping a provider's full history.

CREATE OR REPLACE FUNCTION public.get_provider_booked_slots(
  p_provider_ids uuid[],
  p_from date,
  p_to date
)
RETURNS TABLE (provider_id uuid, slot_date date, slot_time time)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
-- Live schema note (verified 2026-10-09): public.appointments.time is TEXT,
-- not time — hence the ::time cast. Declared return type stays time so
-- callers always get normalized "HH:MM:SS" values.
AS $$
  SELECT a.provider_id, a.date, a.time::time
  FROM public.appointments a
  WHERE a.provider_id = ANY (p_provider_ids)
    AND a.status IN ('scheduled', 'confirmed')
    AND a.date >= p_from
    AND a.date <= p_to
$$;

-- Booking discovery is public (search page and provider profiles are
-- browsable signed out); slot times alone identify no patient.
GRANT EXECUTE ON FUNCTION public.get_provider_booked_slots(uuid[], date, date)
  TO anon, authenticated;
