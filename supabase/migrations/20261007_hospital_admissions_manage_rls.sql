-- 2026-10-07: hospital_admissions write policy (live catch-up)
--
-- The live production database received this policy via the Supabase dashboard
-- during QA on 2026-10-07: admissions were SELECT-only for institution staff,
-- which blocked the IPD/ADT "New Admission" workflow live (verified: admission
-- ADM-MUYHK9XJ succeeded only after the policy was applied).
--
-- This migration records the live change in the repo. Idempotent: safe to
-- re-run; DROP POLICY IF EXISTS guards the re-create.
--
-- Note: the table uses `hospital_id` (not `institution_id`) as the scoping
-- column — verified against live information_schema on 2026-10-07.

DROP POLICY IF EXISTS "Institution staff manage admissions" ON public.hospital_admissions;

CREATE POLICY "Institution staff manage admissions"
ON public.hospital_admissions
FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), hospital_id)
  OR public.has_admin_scope(auth.uid())
)
WITH CHECK (
  public.user_is_institution_staff_for_institution(auth.uid(), hospital_id)
  OR public.has_admin_scope(auth.uid())
);
