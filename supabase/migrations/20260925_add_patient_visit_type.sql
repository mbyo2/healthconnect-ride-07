-- Booking flow fix: BookingModal inserts patient_visit_type ('new' | 'returning')
-- into public.appointments, but the column does not exist in production, so
-- every booking INSERT failed and patients saw "We couldn't create your
-- appointment." Add the column the app already writes.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS patient_visit_type TEXT;
