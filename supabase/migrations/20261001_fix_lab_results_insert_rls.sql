-- Fix: allow pathologists and lab technicians to INSERT lab_results
--
-- Problem found 2026-10-01 during end-to-end lab workflow testing:
-- The lab_results INSERT policy ("Providers with care relationship can insert
-- lab results") only allowed users with a care relationship to the patient,
-- plus admins. Pathologists entering results via /lab-management do NOT have
-- a care relationship with the patient, so the INSERT failed silently under
-- RLS (the app catches the error). Result: lab_tests was updated (status=
-- completed) but no lab_results row was created, so patients saw "No lab
-- results yet" on their My Health Records page.
--
-- Pathologists and lab technicians are the clinical staff who enter results;
-- they already have full manage access to lab_tests via the Phase 1 hardening
-- policies. This aligns lab_results INSERT with that model.
-- Idempotent; safe to re-run.

DROP POLICY IF EXISTS "Providers with care relationship can insert lab results"
  ON public.lab_results;

CREATE POLICY "Providers with care relationship can insert lab results"
ON public.lab_results
FOR INSERT
WITH CHECK (
  public.has_care_relationship(auth.uid(), patient_id)
  OR public.has_role(auth.uid(), 'pathologist'::app_role)
  OR public.has_role(auth.uid(), 'lab_technician'::app_role)
  OR public.has_role(auth.uid(), 'phlebotomist'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);
