-- Fix critical vulnerability: pending providers could issue prescriptions (found 2026-10-04).
--
-- Defect: the INSERT policy on comprehensive_prescriptions was only
--   (auth.uid() = provider_id)
-- with no role or approval check. Any authenticated user — including pending,
-- unverified providers and even patients — could insert prescriptions by setting
-- provider_id to their own ID. Proven live: a pending medical_licentiate test
-- account issued a real e-prescription (since deleted).
--
-- Fix: require the prescriber's profile to have is_verified = true, via a
-- SECURITY DEFINER helper (avoids RLS recursion on profiles, per the 2026-09-30
-- lesson). The approval workflow sets is_verified on approval; pending providers
-- have is_verified = false.
--
-- Blast radius verified 2026-10-04: the only user_roles rows with prescriber
-- roles belonged to the test accounts. The legitimate QA doctor has
-- is_verified=true. No legitimate prescriber is blocked.
--
-- Idempotent; safe to re-run.

CREATE OR REPLACE FUNCTION public.is_verified_prescriber(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = p_user_id
       AND is_verified IS TRUE
  );
$$;

-- Replace the overly-permissive INSERT policy.
DROP POLICY IF EXISTS "Providers can create prescriptions" ON public.comprehensive_prescriptions;

CREATE POLICY "Verified providers can create prescriptions"
  ON public.comprehensive_prescriptions
  FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND public.is_verified_prescriber(auth.uid())
  );
