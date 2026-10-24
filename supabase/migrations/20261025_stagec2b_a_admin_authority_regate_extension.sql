-- Stage C2b Cluster A — 2026-10-25
--
-- P2-8 EXTENSION (beyond the 7 tasked surfaces): six more live policies
-- gate on profiles.admin_level = 'superadmin' with the identical shape
-- re-gated in 20261025_stagec2b_a_admin_authority_regate.sql. Same
-- verified mapping: admin_level 'superadmin' is produced only by
-- user_roles 'super_admin' (trg_sync_admin_level_from_roles), so each
-- becomes has_role(auth.uid(), 'super_admin'). The three FOR ALL
-- policies also gain the explicit WITH CHECK (they were in the P3-6
-- documented remainder / fixed set — app_owner_wallet and
-- subscription_plans had just received a profiles-shaped WITH CHECK
-- from the P3-6 migration; this supersedes it with the re-gated form).
-- profiles' own policies (survey item 8) deliberately keep using the
-- DEFINER helpers per the task scope; the columns and sync trigger stay.

DROP POLICY IF EXISTS "Super admins can manage app owner wallet" ON public.app_owner_wallet;
CREATE POLICY "Super admins can manage app owner wallet"
  ON public.app_owner_wallet FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can manage feature gates" ON public.feature_gates;
CREATE POLICY "Super admins can manage feature gates"
  ON public.feature_gates FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can view all security events" ON public.security_events;
CREATE POLICY "Super admins can view all security events"
  ON public.security_events FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admins can view revenue events" ON public.revenue_events;
CREATE POLICY "Super admins can view revenue events"
  ON public.revenue_events FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
