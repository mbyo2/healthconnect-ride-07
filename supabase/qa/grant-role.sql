-- QA ONLY (not a migration) — grant one exact role to a QA user.
-- Mirrors what the provider-approval function does: canonical user_roles
-- grant + profiles.role mirror + is_verified flag.
--
-- GOTCHA: the two role columns are DIFFERENT enum types. The casts below
-- are required; without them Postgres raises 42804 (text vs enum).
--   public.user_roles.role  →  app_role
--   public.profiles.role    →  user_role
--
-- GOTCHA (proven live 2026-11-16, docswarm instadmin): step 2 does NOT work
-- from direct SQL / the dashboard SQL editor. The audit trigger
-- prevent_profile_privilege_change() silently reverts NEW.role to OLD.role
-- whenever auth.uid() holds no admin/super_admin role — and direct SQL has
-- auth.uid() NULL — so the UPDATE "succeeds" (is_verified flips) while the
-- role stays 'patient'. No error is raised. Do the mirror through the
-- service_role key instead, e.g.:
--   PATCH /rest/v1/profiles?id=eq.<user-id>
--   Authorization: Bearer <service_role key>
--   {"role": "<ROLE>", "is_verified": true}
-- (is_service_role() makes the trigger return NEW unchanged.) Step 1 (the
-- canonical user_roles grant) works fine from direct SQL, and role authority
-- in the app is user_roles ONLY, so the mirror is cosmetic — but keep it
-- consistent rather than leaving a stale 'patient' behind.
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
