-- ============================================================
-- Doc'O Clock — lab_results read/verify RLS policies
--
-- Problem found 2026-09-29 during pathologist sign-off verification:
-- public.lab_results had RLS enabled with ONLY an INSERT policy
-- ("Providers with care relationship can insert lab results").
-- No SELECT / UPDATE / DELETE policies existed, so:
--   * the pathologist "Verify & Sign Off" secondary write
--     (lab_results SET verified_at) failed under RLS, and
--   * the failure was silent (handler did not check the error),
--     leaving lab_tests.verified_* set while lab_results stayed NULL.
--
-- This migration adds the missing read + verify-update policies,
-- mirroring the lab_tests policy structure from the Phase 1
-- hardening (20260926_phase1_db_hardening.sql).
-- Idempotent; safe to re-run.
-- ============================================================

-- 1. Lab staff + care-team providers + the patient can read results
DROP POLICY IF EXISTS "Lab staff and care team can view lab results"
  ON public.lab_results;
CREATE POLICY "Lab staff and care team can view lab results"
ON public.lab_results
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'lab_technician'::app_role)
  OR public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'phlebotomist'::app_role)
  OR public.has_care_relationship(auth.uid(), patient_id)
  OR auth.uid() = patient_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- 2. Pathologists (and admins) can mark results verified
DROP POLICY IF EXISTS "Pathologists can verify lab results"
  ON public.lab_results;
CREATE POLICY "Pathologists can verify lab results"
ON public.lab_results
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
