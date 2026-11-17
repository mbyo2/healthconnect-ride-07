-- In-app appointment reminders (inapp-chat/reminders, 2026-11-17).
-- Links notification rows to the appointment they remind about, marks
-- which kind of reminder a row is, and when it may become visible.
-- The WhatsApp queue (message_queue + send-messages) is untouched: this
-- only adds the in-app surface, with the same scheduled times.
-- No new table, no RLS change: existing user_id policies still gate rows,
-- and the service-role insert policy still covers edge functions.
-- No trigger writes notifications, so there is no double-write source.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS appointment_id uuid
  REFERENCES public.appointments(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'confirmation';

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('confirmation', 'reminder'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS visible_at timestamptz NOT NULL DEFAULT now();

-- Pre-existing rows were visible immediately; keep them visible.
UPDATE public.notifications SET visible_at = created_at
  WHERE visible_at > created_at;

-- One reminder per appointment per channel slot: (appointment_id, kind,
-- visible_at) is unique. No WHERE clause: NULL appointment_id rows stay
-- distinct under Postgres NULL semantics, so legacy/anonymous rows and
-- dispatchNotification inserts are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_appointment_kind_visible_uidx
  ON public.notifications (appointment_id, kind, visible_at);

CREATE INDEX IF NOT EXISTS notifications_user_visible_idx
  ON public.notifications (user_id, visible_at DESC);
