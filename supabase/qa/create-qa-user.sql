-- QA ONLY (not a migration) — insert one disposable QA auth user.
-- Fires the same handle_new_user + create_patient_profile triggers as the
-- browser signup, so the resulting rows are identical to a real signup.
-- Replace <QA_EMAIL>, <QA_FULL_NAME>, and generate the bcrypt hash inline
-- with crypt('<password>', gen_salt('bf')).
-- Keep the statement short: the dashboard SQL editor mangles long input.

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  '<QA_EMAIL>',
  crypt('<QA_PASSWORD>', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', '<QA_FULL_NAME>'),
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = '<QA_EMAIL>'
);
