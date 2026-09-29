-- Phase 0 patient fix: the BEFORE UPDATE trigger on appointments
-- (notify_waitlist_on_cancellation, trigger trg_appointments_cancelled in prod)
-- assigns NEW.cancelled_at := now() when an appointment is cancelled, but the
-- public.appointments table has no cancelled_at column. Every cancellation
-- (patient or provider, app or API) therefore failed with 42703 and the app
-- swallowed the error silently. Add the column the trigger expects.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
