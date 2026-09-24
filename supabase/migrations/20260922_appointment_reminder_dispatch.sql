-- Appointment reminder dispatch support (send-reminder edge worker).
-- RUN VIA: Supabase Dashboard -> SQL Editor (db push is blocked by history divergence).
-- Idempotent: safe to run more than once.

alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;

comment on column public.appointments.reminder_sent_at is
  'Set by the send-reminder worker when the 24h in-app reminder is dispatched; NULL means not yet reminded.';

-- SCHEDULING (pick one; the worker itself does nothing until invoked):
-- 1) Supabase Dashboard -> Edge Functions -> send-reminder -> "Schedule function"
--    (cron: every hour). Provide header x-cron-secret = value of CRON_SECRET.
-- 2) External cron (e.g. cron-job.org) hourly:
--      POST https://<project-ref>.supabase.co/functions/v1/send-reminder
--      Header: x-cron-secret: <CRON_SECRET>
--    Set CRON_SECRET via: supabase secrets set CRON_SECRET=<long-random-value>
--    (Dashboard -> Project Settings -> Edge Functions -> Secrets works too).
--
-- The worker is idempotent: reminder_sent_at IS NULL guard + conditional
-- update mean re-runs and overlapping runs never double-notify.
