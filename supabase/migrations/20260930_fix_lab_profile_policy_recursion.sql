-- 20260930: Fix onboarding "infinite recursion detected in policy for relation profiles"
--
-- ROOT CAUSE (proven by live A/B test 2026-09-29): the inline version of the
-- "Lab staff can view profiles for tests" SELECT policy on public.profiles
-- (created by 20260929_phase1_lab_order_rls.sql) broke the onboarding
-- UPDATE on public.profiles. With the inline policy live, clicking
-- "Complete Profile" failed with 'infinite recursion detected in policy for
-- relation "profiles"'; with only that policy dropped, the same action
-- succeeded. The inline EXISTS subqueries against public.lab_tests re-entered
-- profiles RLS evaluation during the UPDATE (which evaluates the
-- self-referencing UPDATE policy "Admins update other profiles...").
--
-- FIX: wrap the check in a SECURITY DEFINER function. The function is opaque
-- to the RLS rewriter and bypasses RLS on user_roles/lab_tests inside, so it
-- cannot re-enter profiles RLS. This is the same proven pattern as
-- public.user_shares_appointment_with (see 20260925_fix_profiles_recursion.sql).
--
-- The lab queue patient/provider name display keeps working: lab staff can
-- still SELECT the profiles linked to their lab_tests rows.

CREATE OR REPLACE FUNCTION public.user_can_view_lab_profile(viewer_id uuid, profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = viewer_id
        AND ur.role::text IN ('lab_technician', 'pathologist', 'phlebotomist')
    )
    AND EXISTS (
      SELECT 1
      FROM public.lab_tests t
      WHERE t.patient_id = profile_id
         OR t.ordered_by = profile_id
    );
$$;

DROP POLICY IF EXISTS "Lab staff can view profiles for tests" ON public.profiles;

CREATE POLICY "Lab staff can view profiles for tests"
ON public.profiles FOR SELECT
USING (public.user_can_view_lab_profile(auth.uid(), profiles.id));
