-- Fix prescription ALL-policy bypass (found 2026-10-04).
--
-- Defect: the "Providers can manage prescriptions for their patients" policy used
-- FOR ALL with only a USING clause (auth.uid() = provider_id) and no WITH CHECK.
-- PostgreSQL uses the USING clause as the WITH CHECK for INSERTs on ALL policies.
-- Since INSERT uses OR logic across permissive policies, this bypassed the new
-- "Verified providers can create prescriptions" restrictive INSERT policy —
-- pending providers could still prescribe.
--
-- Fix: replace the ALL policy with separate SELECT/UPDATE/DELETE policies
-- (preserving the original USING semantics for those commands). INSERT is now
-- governed solely by "Verified providers can create prescriptions".
--
-- Idempotent; safe to re-run.

DROP POLICY IF EXISTS "Providers can manage prescriptions for their patients"
  ON public.comprehensive_prescriptions;

-- Providers can view their own patients' prescriptions.
DROP POLICY IF EXISTS "Providers can view their prescriptions"
  ON public.comprehensive_prescriptions;
CREATE POLICY "Providers can view their prescriptions"
  ON public.comprehensive_prescriptions
  FOR SELECT
  USING (auth.uid() = provider_id);

-- Providers can update their own prescriptions.
DROP POLICY IF EXISTS "Providers can update their prescriptions"
  ON public.comprehensive_prescriptions;
CREATE POLICY "Providers can update their prescriptions"
  ON public.comprehensive_prescriptions
  FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Providers can delete their own prescriptions.
DROP POLICY IF EXISTS "Providers can delete their prescriptions"
  ON public.comprehensive_prescriptions;
CREATE POLICY "Providers can delete their prescriptions"
  ON public.comprehensive_prescriptions
  FOR DELETE
  USING (auth.uid() = provider_id);

-- INSERT remains governed solely by "Verified providers can create prescriptions"
-- (requires auth.uid() = provider_id AND is_verified_prescriber(auth.uid())).
