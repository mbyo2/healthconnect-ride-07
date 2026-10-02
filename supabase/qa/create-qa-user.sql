-- QA ONLY (not a migration) — insert one disposable QA auth user.
-- Fires the same handle_new_user + create_patient_profile triggers as the
-- browser signup, so the resulting rows are identical to a real signup.
-- Replace <QA_EMAIL>, <QA_FULL_NAME>, and generate the bcrypt hash inline
-- with crypt('<password>', gen_salt('bf')).
-- Keep the statement short: the dashboard SQL editor mangles long input.
--
-- GOTCHAS (learned 2026-10-02, root-caused via "Database error querying schema"):
-- 1) instance_id MUST be '00000000-0000-0000-0000-000000000000' or GoTrue
--    rejects the login even with a correct password.
-- 2) Token columns MUST be '' (empty string), not NULL. GoTrue's user
--    lookup fails with "Database error querying schema" when
--    confirmation_token / recovery_token / email_change_token_new /
--    email_change are NULL. Normal GoTrue signups store ''.
-- 3) auth.identities needs a companion row (provider='email'), or some
--    GoTrue flows break. Create it right after the user row.

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  '<QA_EMAIL>',
  crypt('<QA_PASSWORD>', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', '<QA_FULL_NAME>'),
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = '<QA_EMAIL>'
);

-- Companion identity row (separate short statement, fresh tab):
-- INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
-- SELECT gen_random_uuid(), u.id,
--        jsonb_build_object('sub', u.id::text, 'email', u.email),
--        'email', u.id::text, now(), now()
-- FROM auth.users u
-- WHERE u.email = '<QA_EMAIL>'
--   AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id);
