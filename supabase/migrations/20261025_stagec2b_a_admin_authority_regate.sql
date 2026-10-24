-- Stage C2b Cluster A — 2026-10-25
--
-- P2-8 (DB remediation): re-gate the 7 policy surfaces surveyed in
-- stagec2a-b-p2-8-p2-9-documentation-2026-10-24.md from the legacy
-- profiles.role / profiles.admin_level columns onto public.user_roles via
-- the existing SECURITY DEFINER helpers has_role() / has_admin_scope().
--
-- Semantics mapping (verified live before writing this):
--   * sync_admin_level_from_roles(): user_roles super_admin ->
--     profiles.admin_level 'superadmin'; user_roles admin -> 'admin';
--     otherwise NULL. So admin_level IN ('admin','superadmin') is exactly
--     has_admin_scope() (admin OR super_admin in user_roles).
--   * Real admin accounts live: every profiles row with role='admin'
--     belongs to a holder of user_roles admin and/or super_admin, so
--     profiles.role='admin' is likewise has_admin_scope() in effect.
--   * admin_level = 'superadmin' alone is exactly
--     has_role(auth.uid(), 'super_admin').
-- The profiles columns and trg_sync_admin_level_from_roles are NOT
-- removed (display/sync artefacts only after this migration).
-- No policy below is on public.profiles, and every replacement uses
-- DEFINER helpers, so the 2026-09-30 profiles RLS recursion mechanism
-- cannot re-open (no inline cross-table EXISTS in any new policy).

-- ---------------------------------------------------------------------
-- (1) application_extended_data — admin policies (profiles.role='admin')
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_manage_extended_data" ON public.application_extended_data;
CREATE POLICY "admin_manage_extended_data"
  ON public.application_extended_data FOR ALL
  TO authenticated
  USING (public.has_admin_scope(auth.uid()))
  WITH CHECK (public.has_admin_scope(auth.uid()));

DROP POLICY IF EXISTS "admin_view_extended_data" ON public.application_extended_data;
CREATE POLICY "admin_view_extended_data"
  ON public.application_extended_data FOR SELECT
  TO authenticated
  USING (public.has_admin_scope(auth.uid()));

-- ---------------------------------------------------------------------
-- (2) institution_networks — admin policy (profiles.role='admin')
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Institution networks accessible by admins" ON public.institution_networks;
CREATE POLICY "Institution networks accessible by admins"
  ON public.institution_networks FOR ALL
  TO authenticated
  USING (public.has_admin_scope(auth.uid()))
  WITH CHECK (public.has_admin_scope(auth.uid()));

-- ---------------------------------------------------------------------
-- (3) health_personnel_applications — approval UPDATE (admin_level)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can approve health personnel applications" ON public.health_personnel_applications;
CREATE POLICY "Only admins can approve health personnel applications"
  ON public.health_personnel_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ---------------------------------------------------------------------
-- (4) institution_applications — approval UPDATE (admin_level)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can approve institution applications" ON public.institution_applications;
CREATE POLICY "Only admins can approve institution applications"
  ON public.institution_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ---------------------------------------------------------------------
-- (5) healthcare_institutions — super-admin policies (admin_level =
--     'superadmin' only) + the profiles.role='admin' branch of
--     public_view_institutions
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Super admins can delete institutions" ON public.healthcare_institutions;
CREATE POLICY "Super admins can delete institutions"
  ON public.healthcare_institutions FOR DELETE
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can insert institutions" ON public.healthcare_institutions;
CREATE POLICY "Super admins can insert institutions"
  ON public.healthcare_institutions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can update institutions" ON public.healthcare_institutions;
CREATE POLICY "Super admins can update institutions"
  ON public.healthcare_institutions FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "public_view_institutions" ON public.healthcare_institutions;
CREATE POLICY "public_view_institutions"
  ON public.healthcare_institutions FOR SELECT
  USING (
    (list_in_marketplace = true AND verified = true AND status = 'approved')
    OR auth.uid() = admin_id
    OR public.has_admin_scope(auth.uid())
  );

-- ---------------------------------------------------------------------
-- (6) security_audit_log — SELECT via get_current_user_admin_level().
--     Two user_roles-based SELECT policies already cover the same
--     audience ("Admins can view all audit logs" via has_role admin /
--     super_admin, and "Admins can view security audit logs" via
--     has_admin_scope()), so the profiles-based policy is a duplicate
--     authority path: drop it, coverage is unchanged for genuine admins.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.security_audit_log;

-- ---------------------------------------------------------------------
-- (7) storage.objects — registration-docs policy via
--     is_admin_via_profiles(). A parallel has_role-based policy
--     ("Admins can read registration documents", admin / super_admin)
--     already exists on the same bucket, so per the survey the
--     profiles-based duplicate is DROPPED, not re-created.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all registration docs" ON storage.objects;
