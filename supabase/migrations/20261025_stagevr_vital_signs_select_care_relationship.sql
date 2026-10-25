-- Stage VR — vitals re-read gap (launch ledger §7 item 14 / P2-4 observation).
--
-- Live state before this migration (pg_policies, 2026-10-25):
--   * "Users can view their own vital signs" (SELECT):
--     auth.uid() = user_id.
--   * "Providers with active appointments can view vital signs" (SELECT):
--     auth.uid() = user_id OR platform admin OR an appointment where the
--     caller is personally the provider for this patient (last 90 days).
--   * "Record vitals for self or care-relationship patient" (INSERT,
--     Stage C2a Cluster B): auth.uid() = user_id OR
--     public.can_record_vitals_for(user_id) — the SECURITY DEFINER helper
--     whose care relationship is WIDER than the SELECT set: a clinical-role
--     user may also record when the patient has an appointment at an
--     institution the caller is an active staff member of, or an active
--     patient_institution_links row at such an institution.
--
-- Gap: an institution nurse can RECORD vitals for a ward patient
-- (INSERT 201) but can never RE-READ them (SELECT returns 0 rows) unless
-- they personally hold an appointment with that patient. The app inserts
-- without .select(), so nothing visibly failed; chart re-reads silently
-- missed the rows.
--
-- Fix: ONE additional SELECT policy whose predicate mirrors the INSERT
-- gate exactly, reusing the existing SECURITY DEFINER helper
-- can_record_vitals_for() (cross-table checks stay inside the DEFINER
-- helper — never inlined into a policy, per the 2026-09-30 RLS recursion
-- lesson). The helper's own clinical-role gate is part of the predicate,
-- so non-clinical institution staff (e.g. billing_staff) gain nothing.
-- Permissive policies OR together: the two existing SELECT policies and
-- the INSERT policy are deliberately left untouched.

DROP POLICY IF EXISTS "Care-relationship clinicians can view patient vital signs" ON public.vital_signs;

CREATE POLICY "Care-relationship clinicians can view patient vital signs"
  ON public.vital_signs
  FOR SELECT
  TO authenticated
  USING (public.can_record_vitals_for(user_id));
