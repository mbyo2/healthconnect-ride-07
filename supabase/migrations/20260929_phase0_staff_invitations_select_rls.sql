-- Phase 0 fix (2026-09-29): staff_invitations SELECT was broken for EVERY
-- authenticated user.
--
-- Root cause: policy "Users view own invitations" evaluated
--   USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
-- as the invoking role. The `authenticated` role has no privilege on
-- auth.users, so policy evaluation raised
--   42501: permission denied for table users
-- and the entire SELECT failed. The app swallowed the error as an empty
-- list ("No invitations sent yet", Pending Invites = 0).
--
-- The INSERT path kept working because the FOR ALL policy's WITH CHECK only
-- evaluated SECURITY DEFINER helpers (is_institution_admin, is_service_role),
-- which never touch auth.users — hence the asymmetry: invites were created
-- but invisible.
--
-- Fix: read the email from the JWT claim instead of auth.users. auth.jwt()
-- needs no table access and is available to authenticated callers.
DROP POLICY IF EXISTS "Users view own invitations" ON public.staff_invitations;
CREATE POLICY "Users view own invitations" ON public.staff_invitations
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Same latent anti-pattern on login_security_log (FOR INSERT ... WITH CHECK
-- touching auth.users would 42501 on the first authenticated insert).
-- Nothing in the app inserts there today; fix pre-emptively.
DROP POLICY IF EXISTS "Users can insert own login events" ON public.login_security_log;
CREATE POLICY "Users can insert own login events" ON public.login_security_log
  FOR INSERT TO authenticated
  WITH CHECK (email = (auth.jwt() ->> 'email'));
