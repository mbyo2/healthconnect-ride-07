-- Stage C2a Cluster B — P2-14 follow-up.
--
-- After 20261025_stagec2a_b_smart_invoice_credentials.sql was applied
-- and verified (broad SELECT gone), a policy named
-- "Users can view own institution settings" reappeared on
-- institution_smart_invoice_settings with
--   USING (is_zra_institution_member(institution_id))
-- — i.e. ANY institution personnel member could again read the full
-- row including encrypted_credentials, re-opening P2-14 in a new
-- form (the is_zra_* helpers and this policy shape were not present
-- in the live dump taken at the start of this cluster; they landed
-- mid-flight from parallel work).
--
-- The P2-14 fix stands: full-row SELECT belongs to the institution
-- owner / platform admin scope (the remaining "Institution owners can
-- view their settings" policy) and the service role; personnel use
-- get_smart_invoice_settings_public(), which strips
-- encrypted_credentials. Drop the member SELECT policy again.

DROP POLICY IF EXISTS "Users can view own institution settings"
  ON public.institution_smart_invoice_settings;
