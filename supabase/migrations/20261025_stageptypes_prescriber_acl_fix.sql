-- Provider-types sweep 2026-10-25: prescribing was broken platform-wide, and
-- the shared-equipment request policy with it.
--
-- Defect 1 (availability): migration 20261025_stagec16_function_acl_sweep.sql
-- revoked EXECUTE on RLS-policy helper functions from `authenticated`.
-- Policies evaluate helpers with the CALLER's privileges, so every
-- INSERT into comprehensive_prescriptions has failed with
-- 42501 "permission denied for function is_verified_prescriber" since the
-- sweep — no provider could create a prescription at all. A policy-expression
-- scan (pg_policies x pg_proc ACLs) found exactly three policy-invoked
-- helpers missing the authenticated grant; the other two break the
-- equipment_share_requests staff INSERT policy the same way.
-- Fix: restore EXECUTE for authenticated (never anon) on the three helpers,
-- matching every sibling policy helper (has_role, can_record_vitals_for,
-- user_affiliated_with_institution all carry authenticated=X).
GRANT EXECUTE ON FUNCTION public.is_verified_prescriber(p_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_owner_institution(p_asset_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_asset_shareable(p_asset_id uuid) TO authenticated;

-- Defect 2 (charter enforcement): is_verified_prescriber never checked the
-- caller's profession. profiles.is_verified is true for ordinary approved
-- accounts of many kinds, so once the grant is restored ANY verified user
-- (nurse, pharmacist, patient) could insert a prescription naming
-- themselves as provider — the UI hides the button, but RLS is the security
-- boundary. The prescribing charter (PRESCRIBING_ROLES in roleConfig.ts) is
-- exactly six professions; enforce it in the helper the policy already calls.
-- Legitimate prescribers always hold their profession role in user_roles
-- (granted by the approval pipeline), so no legitimate flow is blocked.
CREATE OR REPLACE FUNCTION public.is_verified_prescriber(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT is_verified FROM public.profiles WHERE id = p_user_id), false)
     AND NOT public.is_provider_suspended(p_user_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.role IN ('doctor'::app_role, 'specialist'::app_role,
                          'medical_licentiate'::app_role, 'clinical_officer'::app_role,
                          'dentist'::app_role, 'optometrist'::app_role)
     );
$function$;
