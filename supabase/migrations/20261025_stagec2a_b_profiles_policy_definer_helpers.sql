-- Stage C2a Cluster B — P2-9: remove the last self-referencing
-- subqueries from a `profiles` policy (RLS-recursion hazard).
--
-- Live state before this migration: the profiles UPDATE policy
-- "Admins update other profiles; only super admins change privileg"
-- (Postgres truncated the name at 63 chars) carried, inside its
-- WITH CHECK, two scalar subqueries against public.profiles itself:
--   (role = (SELECT p.role FROM profiles p WHERE p.id = profiles.id))
--   (admin_level IS DISTINCT FROM (SELECT p.admin_level FROM profiles p
--                                  WHERE p.id = profiles.id))
-- Self-referencing subqueries inside profiles policies are half of the
-- exact mechanism that hard-failed profile UPDATEs platform-wide on
-- 2026-09-30 (see AGENTS.md RLS recursion lesson): evaluating a
-- profiles policy re-enters profiles RLS, and any future inline
-- cross-table policy on profiles re-closes the cycle. The proven
-- remedy is to move the reads into SECURITY DEFINER helpers, which are
-- opaque to the RLS rewriter and bypass RLS internally — the same
-- pattern the sibling policy "Users update own profile without
-- privilege fields" already uses via get_current_user_role() /
-- get_current_user_admin_level().
--
-- This migration is semantics-preserving: the two subqueries become
-- profile_role_of(profiles.id) / profile_admin_level_of(profiles.id),
-- which return exactly the stored role / admin_level of the target
-- row. Every other clause of the policy is byte-identical.
--
-- P2-8 note (documentation; full survey in the stage report):
-- profiles.role / profiles.admin_level still gate other live surfaces
-- (application_extended_data admin policies, health_personnel_
-- applications / institution_applications approval policies,
-- healthcare_institutions super-admin policies, storage policy
-- "Admins can view all registration docs" via is_admin_via_profiles(),
-- security_audit_log via get_current_user_admin_level(), and the
-- client-side merge of profiles.role into availableRoles in
-- UserRolesContext). Those are on OTHER tables (no recursion hazard)
-- and are deliberately NOT re-gated here: the columns are write-pinned
-- today (profiles INSERT policy forces role='patient' + admin_level
-- NULL; both UPDATE policies pin them via DEFINER helpers / this
-- policy), and re-gating clinical approval flows onto user_roles is a
-- product-visible change that belongs in its own stage.

CREATE OR REPLACE FUNCTION public.profile_role_of(p_profile_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = p_profile_id;
$$;

CREATE OR REPLACE FUNCTION public.profile_admin_level_of(p_profile_id uuid)
RETURNS public.admin_level
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_level FROM public.profiles WHERE id = p_profile_id;
$$;

REVOKE ALL ON FUNCTION public.profile_role_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.profile_admin_level_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_role_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_admin_level_of(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins update other profiles; only super admins change privileg"
  ON public.profiles;

CREATE POLICY "Admins update other profiles; only super admins change privileg"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() <> id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  )
  WITH CHECK (
    (auth.uid() <> id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
    AND (
      public.is_super_admin()
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR (
        (role = public.profile_role_of(profiles.id))
        AND (NOT (admin_level IS DISTINCT FROM public.profile_admin_level_of(profiles.id)))
      )
    )
  );
