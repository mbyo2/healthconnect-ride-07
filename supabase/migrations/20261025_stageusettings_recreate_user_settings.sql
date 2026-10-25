-- Repair the phantom `public.user_settings` table (follow-up to the
-- a11y-toggle addendum, 2026-10-25).
--
-- `20240322000001_settings_tables.sql` created notification_settings,
-- push_subscriptions and user_settings in the repo, but live only the
-- first two exist — user_settings never applied (same drift class as
-- lab_results, 2026-09-30). Every Settings Language / Timezone /
-- Date-format write has been 404ing (PGRST205) ever since: the controls
-- set local state so they LOOK saved, but nothing persists server-side,
-- and the fetchSettings read-back fails into defaults.
--
-- Decision (2026-10-25, CEO best-and-most-secure completion mandate):
-- recreate the table. The settings were designed to persist
-- server-side; the silent no-persist state is the defect.
--
-- Shape = the 2024 design reconciled with what current code reads/writes:
--  * Settings.tsx (the live caller) selects * by user_id and upserts
--    {user_id, language|timezone|date_format} with onConflict "user_id"
--    -> the wide columns and UNIQUE(user_id) are mandatory.
--  * language default is 'en' (2024 said 'english'): current code only
--    ever writes language CODES ('en'/'fr'/'es') and falls back to
--    'en'; a row created by a timezone-only upsert must not surface a
--    non-code default.
--  * src/utils/settings-workflows.ts (no live callers today; only a doc
--    comment in src/types/settings.ts references it) reads/writes a
--    KEY-VALUE shape on this same table: setting_key, value, status,
--    change_history. Those columns are added (nullable) so its exact
--    queries execute. Cardinality note: UNIQUE(user_id) keeps the
--    table one-row-per-user, exactly as the 2024 design specified —
--    workflows' per-key multi-row semantics would need a separate
--    table if that helper is ever wired up; recorded in the addendum.
--  * status carries a CHECK for the helper's SettingStatus union.
--
-- RLS mirrors the live sibling notification_settings (own-row only).
-- Deliberate hardening vs the sibling: the UPDATE policy also carries
-- WITH CHECK (auth.uid() = user_id) so a row cannot be reassigned to
-- another user; no caller ever changes user_id, and the upsert
-- conflict-update path still satisfies the check.
--
-- Grants: default privileges apply, identical to notification_settings
-- (anon/authenticated/service_role full DML grants; RLS is the gate) —
-- verified post-apply in the addendum.

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  accessibility_mode BOOLEAN DEFAULT FALSE,
  setting_key TEXT,
  value JSONB,
  status TEXT CHECK (status IS NULL OR status IN ('active', 'inactive', 'pending', 'archived')),
  change_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER handle_updated_at_user_settings
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
