-- Fix lab_tests RLS: allow admins and check profiles.role for clinical professions
--
-- The 20260929_phase1_lab_order_rls.sql policy only checked user_roles (app_role enum)
-- via has_role(). But QA doctors have their clinical profession in profiles.role
-- (user_role enum), not in user_roles. And superadmins/admins should be able to
-- order labs regardless.
--
-- This updates the policy to:
-- 1. Allow superadmin/admin (via has_role with admin/institution_admin)
-- 2. Check profiles.role for the clinical professions (doctor, specialist, etc.)
--
-- Discovered 2026-10-01 during E2E lab workflow testing: doctor got
-- "new row violates row-level security policy for table lab_tests"

DROP POLICY IF EXISTS "Ordering clinicians can create lab tests"
  ON public.lab_tests;

CREATE POLICY "Ordering clinicians can create lab tests"
  ON public.lab_tests FOR INSERT TO authenticated
  WITH CHECK (
    ordered_by = auth.uid()
    AND (
      -- Admins can order (superadmin, admin, institution_admin)
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'institution_admin')
      -- Clinical professions via user_roles (app_role enum)
      OR public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'specialist')
      OR public.has_role(auth.uid(), 'medical_licentiate')
      OR public.has_role(auth.uid(), 'clinical_officer')
      OR public.has_role(auth.uid(), 'dentist')
      OR public.has_role(auth.uid(), 'radiologist')
      -- Clinical professions via profiles.role (user_role enum)
      -- The QA doctor's profession is in profiles, not user_roles
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('doctor', 'specialist', 'medical_licentiate', 'clinical_officer', 'dentist', 'radiologist')
      )
    )
  );
