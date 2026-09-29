-- Phase 1 (2026-09-29): prescription write governance.
--
-- Legal prescribing in Zambia is limited to five professions:
--   doctor, specialist, medical_licentiate, clinical_officer, dentist
-- (mirrors PRESCRIBING_ROLES in src/config/roleConfig.ts).
--
-- Previously the "Providers can manage their prescriptions" policy allowed ANY
-- authenticated user with provider_id = auth.uid() to INSERT/UPDATE/DELETE
-- prescriptions, because every clinical cadre inherits the generic
-- 'health_personnel' compatibility role. This replaces it with a policy that
-- additionally requires one of the five legal prescribing roles (checked via
-- the SECURITY DEFINER has_role() helper to avoid RLS recursion).
--
-- Read behaviour is unchanged: patients still read their own prescriptions,
-- providers still read rows they authored. Pharmacists keep whatever access
-- path the pharmacy dispense flow uses today (their legacy policies were
-- dropped in 2026-07 and are out of scope here).
--
-- Idempotent: safe to re-run.

DROP POLICY IF EXISTS "Providers can manage their prescriptions"
  ON public.comprehensive_prescriptions;

DROP POLICY IF EXISTS "Prescribers can manage their prescriptions"
  ON public.comprehensive_prescriptions;

CREATE POLICY "Prescribers can manage their prescriptions"
  ON public.comprehensive_prescriptions
  FOR ALL
  USING (
    provider_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'specialist')
      OR public.has_role(auth.uid(), 'medical_licentiate')
      OR public.has_role(auth.uid(), 'clinical_officer')
      OR public.has_role(auth.uid(), 'dentist')
    )
  )
  WITH CHECK (
    provider_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'doctor')
      OR public.has_role(auth.uid(), 'specialist')
      OR public.has_role(auth.uid(), 'medical_licentiate')
      OR public.has_role(auth.uid(), 'clinical_officer')
      OR public.has_role(auth.uid(), 'dentist')
    )
  );
