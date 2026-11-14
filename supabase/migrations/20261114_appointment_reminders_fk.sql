-- 20261114_appointment_reminders_fk.sql
-- Bug-free gate 2026-11-14 (C1): appointment_reminders.appointment_id had
-- NO foreign key, so the client embed
--   appointments(date, time, type, provider_id)
-- in src/components/booking/AppointmentReminders.tsx 400d live with
-- PGRST200 "Could not find a relationship" and reminders never loaded.
-- Live pre-check 2026-11-14: 0 rows, 0 orphans, appointment_id NOT NULL.
-- ON DELETE CASCADE: a reminder is subordinate to its appointment.
-- Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appointment_reminders_appointment_id_fkey'
  ) THEN
    ALTER TABLE public.appointment_reminders
      ADD CONSTRAINT appointment_reminders_appointment_id_fkey
      FOREIGN KEY (appointment_id)
      REFERENCES public.appointments(id)
      ON DELETE CASCADE;
  END IF;
END $$;
