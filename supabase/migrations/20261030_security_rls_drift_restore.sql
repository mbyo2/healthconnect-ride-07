-- Security audit 2026-10-30: restore scoped RLS on five tables whose SELECT
-- policies had drifted live to USING (true) for PUBLIC (anon included), and
-- restore the lost "Admins manage fraction rules" write policy.
-- Live proof before this fix (seeded rows, PostgREST): BOTH an unauthenticated
-- caller holding only the publishable key AND an unrelated signed-in user
-- could read every row of lis_results (patient lab data), patient_merges
-- (patient identity linkage), doctor_fraction_earnings, doctor_fraction_rules
-- and institution_reminder_settings. The repo migrations (20261019/20261020)
-- always carried the scoped predicates restored below; this file is the
-- drift-correction record. All predicates go through SECURITY DEFINER
-- helpers (no inline cross-table subqueries).

-- 1) lis_results: institution staff of that institution only.
DROP POLICY IF EXISTS "Institution staff view LIS results" ON public.lis_results;
CREATE POLICY "Institution staff view LIS results"
  ON public.lis_results FOR SELECT TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()));
REVOKE ALL ON public.lis_results FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lis_results FROM authenticated;

-- 2) patient_merges: merge admins only (platform admin/super_admin roles or
--    an institution admin, via the shared can_merge_patients() gate).
DROP POLICY IF EXISTS "Admins view merges" ON public.patient_merges;
CREATE POLICY "Admins view merges"
  ON public.patient_merges FOR SELECT TO authenticated
  USING (public.can_merge_patients());
REVOKE ALL ON public.patient_merges FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.patient_merges FROM authenticated;

-- 3) doctor_fraction_earnings: the doctor themselves, institution staff of
--    that institution, or that institution's admin (the 20261019 migration's
--    stated intent "Doctors see own earnings, admins see all"; writes happen
--    only inside apply_doctor_fraction_earning, SECURITY DEFINER).
DROP POLICY IF EXISTS "View fraction earnings" ON public.doctor_fraction_earnings;
CREATE POLICY "View fraction earnings"
  ON public.doctor_fraction_earnings FOR SELECT TO authenticated
  USING (
    doctor_id = auth.uid()
    OR public.is_institution_staff(institution_id, auth.uid())
    OR public.is_institution_admin(institution_id)
  );
REVOKE ALL ON public.doctor_fraction_earnings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.doctor_fraction_earnings FROM authenticated;

-- 4) doctor_fraction_rules: staff read; institution admins manage. The FOR ALL
--    policy had been lost live, which silently broke rule creation and
--    deactivation in the billing UI (RLS default-deny) — restored here.
DROP POLICY IF EXISTS "Institution staff view fraction rules" ON public.doctor_fraction_rules;
CREATE POLICY "Institution staff view fraction rules"
  ON public.doctor_fraction_rules FOR SELECT TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()));
DROP POLICY IF EXISTS "Admins manage fraction rules" ON public.doctor_fraction_rules;
CREATE POLICY "Admins manage fraction rules"
  ON public.doctor_fraction_rules FOR ALL TO authenticated
  USING (public.is_institution_admin(institution_id))
  WITH CHECK (public.is_institution_admin(institution_id));
REVOKE ALL ON public.doctor_fraction_rules FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.doctor_fraction_rules FROM authenticated;

-- 5) institution_reminder_settings: institution staff/admin read only (the
--    send-messages function reads via service_role; no client writes exist).
DROP POLICY IF EXISTS "Institution staff view reminder settings" ON public.institution_reminder_settings;
CREATE POLICY "Institution staff view reminder settings"
  ON public.institution_reminder_settings FOR SELECT TO authenticated
  USING (
    public.is_institution_staff(institution_id, auth.uid())
    OR public.is_institution_admin(institution_id)
  );
REVOKE ALL ON public.institution_reminder_settings FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.institution_reminder_settings FROM authenticated;

-- 6) Root cause of the drift: can_merge_patients() had lost its EXECUTE grant
--    for authenticated (every sibling helper has one), so the scoped
--    patient_merges policy raised 42501 for every signed-in user — the likely
--    reason someone replaced its predicate with true. Restore the grant so
--    the scoped policy can actually evaluate.
GRANT EXECUTE ON FUNCTION public.can_merge_patients() TO authenticated;
