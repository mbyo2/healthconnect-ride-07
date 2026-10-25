-- Companion fix to the user_settings recreate (2026-10-25): the live
-- `notification_settings` table also drifted from
-- 20240322000001_settings_tables.sql — it exists, but WITHOUT the
-- UNIQUE(user_id) the 2024 design specified. Settings.tsx's
-- upsertNotificationSettings upserts with onConflict "user_id", and
-- Postgres answers 42P10 ("there is no unique or exclusion constraint
-- matching the ON CONFLICT specification") — proven live at API level
-- as a disposable QA patient (HTTP 400, nothing persisted). Every
-- Settings email/push preference write through that helper has failed
-- the same way; the table holds 0 rows, consistent with the helper
-- being its only writer. (The a11y mission's control write used a
-- plain insert, which is why the table itself looked healthy.)
--
-- The fix is the missing arbiter, nothing else: a unique index on
-- user_id. Name mirrors the constraint the 2024 design would have
-- created. Safe to apply: 0 rows live, so no duplicates can exist.

CREATE UNIQUE INDEX IF NOT EXISTS notification_settings_user_id_key
  ON public.notification_settings (user_id);
