-- Remove duplicate auth.users trigger that broke institution signup
--
-- Two triggers were firing auto_create_provider_application() on every signup:
--   - on_auth_user_created_application (2026-03-08, kept)
--   - on_auth_user_created_provider_application (2026-05-07, duplicate, dropped)
--
-- On institution/pharmacy/lab signup, both fired. The second INSERT into
-- public.healthcare_institutions violated the unique index
-- uq_healthcare_institutions_admin_name (admin_id, name), aborting the
-- transaction and failing signup with "Database error saving new user".
-- The healthcare_institutions INSERT has no ON CONFLICT clause (unlike the
-- health_personnel_applications INSERT in the same function).
--
-- Discovered 2026-10-01 during the first real end-to-end institution signup
-- test. Postgres logs confirmed: 23505 duplicate key violation on
-- uq_healthcare_institutions_admin_name during POST /auth/v1/signup.

DROP TRIGGER IF EXISTS on_auth_user_created_provider_application ON auth.users;
