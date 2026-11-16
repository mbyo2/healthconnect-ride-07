-- QA ONLY (not a migration) — grant one exact role to a QA user.
-- Mirrors what the provider-approval function does: canonical user_roles
-- grant + profiles.role mirror + is_verified flag.
--
-- GOTCHA: the two role columns are DIFFERENT enum types. The casts below
-- are required; without them Postgres raises 42804 (text vs enum).
--   public.user_roles.role  →  app_role
--   public.profiles.role    →  user_role
--
-- Replace <QA_EMAIL> and <ROLE> (must exist in both enums, e.g.
-- 'super_admin', 'support', 'doctor', 'pharmacist', 'receptionist', ...).
-- Run as two short statements: the dashboard SQL editor mangles long input.
--
-- GOTCHA 2 (proven live 2026-11-16, doc swarm group 1): step 2's
-- profiles.role assignment SILENTLY DOES NOTHING when run as direct SQL
-- (dashboard editor / Management API). The BEFORE UPDATE trigger
-- prevent_profile_privilege_change reverts NEW.role to OLD.role unless
-- the caller is a super_admin/admin JWT or the service role — direct SQL
-- has auth.uid() NULL, so the UPDATE succeeds and reports no error while
-- profiles.role stays 'patient'. (The same guard also explains why the
-- gate14 doctor/instadmin QA accounts still carry profiles.role='patient'
-- live despite holding doctor/institution_admin in user_roles.)
-- The role authority is user_roles (step 1) + the get_user_role RPC — the
-- app does NOT need profiles.role to equal the clinical role. The
-- profiles.role value the signup trigger actually produces is coarse:
-- 'health_personnel' when raw_user_meta_data.role is a provider_types
-- code (or 'pharmacy'/'lab'/'institution_admin'), else 'patient'
-- (handle_new_user). So:
--   * For a NEW QA user, set the role in raw_user_meta_data at creation
--     (create-qa-user.sql: add "role": "<ROLE>" to the meta object) and
--     profiles.role will land as 'health_personnel' via the trigger.
--   * For an EXISTING QA user, step 1 (user_roles grant) is the effective
--     grant. Do NOT "fix" the mirror by weakening the trigger — the
--     silent revert is the privilege-escalation guard doing its job.
--   * The is_verified / name / specialty / provider_type parts of step 2
--     DO apply via direct SQL (only role/admin_level are guarded), so
--     keep them and drop the role assignment from the statement below.

-- 1) canonical grant
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, '<ROLE>'::app_role, u.id
FROM auth.users u
WHERE u.email = '<QA_EMAIL>'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) profiles mirror + verified flag (role assignment REMOVED — see
-- GOTCHA 2 above: it silently reverts via direct SQL)
UPDATE public.profiles p
SET is_verified = true,
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND u.email = '<QA_EMAIL>';
