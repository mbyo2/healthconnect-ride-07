-- 2026-10-07: SMS reminders preference on profiles.
-- Applied live 2026-10-07.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sms_reminders_enabled boolean NOT NULL DEFAULT false;
