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

-- 1) canonical grant
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT u.id, '<ROLE>'::app_role, u.id
FROM auth.users u
WHERE u.email = '<QA_EMAIL>'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) profiles mirror + verified flag
UPDATE public.profiles p
SET role = '<ROLE>'::user_role,
    is_verified = true,
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND u.email = '<QA_EMAIL>';
