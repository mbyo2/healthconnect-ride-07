-- Phase 1 (2026-09-29): lab order workflow — RLS for ordering clinicians.
--
-- The provider dashboard advertises a live 'lab_orders' module for
-- doctor, specialist, medical_licentiate, clinical_officer, dentist and
-- radiologist, but no INSERT policy ever let those professions create a
-- lab_tests row (only lab_technician/pathologist/admin could write).
--
-- 1. "Ordering clinicians can create lab tests": the six ordering professions
--    may INSERT lab_tests rows with themselves as ordered_by.
-- 2. "Lab staff can view profiles for tests": lab_technician, pathologist and
--    phlebotomist may read the profile row of a test's patient (so the work
--    queue shows real names instead of null) and of the ordering provider.
--    Scoped to patients/providers that actually have a lab_tests row — the
--    care-team model extended to the lab.
--
-- Idempotent: safe to re-run.

-- ── 1. Ordering clinicians can create lab test orders ──────────────────────
DROP POLICY IF EXISTS "Ordering clinicians can create lab tests"
  ON public.lab_tests;

CREATE POLICY "Ordering clinicians can create lab tests"
  ON public.lab_tests FOR INSERT TO authenticated
  WITH CHECK (
    ordered_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'specialist')
      OR public.has_role(auth.uid(), 'medical_licentiate')
      OR public.has_role(auth.uid(), 'clinical_officer')
      OR public.has_role(auth.uid(), 'dentist')
      OR public.has_role(auth.uid(), 'radiologist')
    )
  );

-- ── 2. Lab staff can read patient/provider profiles for tests ─────────────
DROP POLICY IF EXISTS "Lab staff can view profiles for tests"
  ON public.profiles;

CREATE POLICY "Lab staff can view profiles for tests"
  ON public.profiles FOR SELECT
  USING (
    (
      public.has_role(auth.uid(), 'lab_technician')
      OR public.has_role(auth.uid(), 'pathologist')
      OR public.has_role(auth.uid(), 'phlebotomist')
    )
    AND (
      EXISTS (SELECT 1 FROM public.lab_tests t WHERE t.patient_id = profiles.id)
      OR EXISTS (SELECT 1 FROM public.lab_tests t WHERE t.ordered_by = profiles.id)
    )
  );
