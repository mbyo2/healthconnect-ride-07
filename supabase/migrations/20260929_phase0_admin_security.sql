-- ============================================================
-- Doc'O Clock — Phase 0: admin / facility-operations RLS + role grants
--
-- Fixes (from Phase 0 admin audit, 2026-09-29):
--  B-1: super_admin RLS-blind on platform oversight tables (policies used
--       has_role('admin') only; create-admin grants exactly one role, so a
--       pure super_admin saw empty Revenue/Audit/Security screens).
--  B-2: plain admin RLS-blind on security_audit_log.
--  B-3: appointments/payments had NO institution-staff RLS — receptionist
--       Schedule empty, all facility appointment/revenue KPIs zero.
--  B-5: institution approval never granted institution_admin in user_roles;
--       non-transactional 3-step client sequence.
--  D-2: promo-code RLS (admin+superadmin writes) wider than UI intent
--       (superadmin-only create/toggle) — direct-API control bypass.
--  D-6: profiles.admin_level drift — is_super_admin() read the legacy
--       denormalized column instead of user_roles.
--
-- Idempotent; safe to re-run. Apply via Supabase SQL editor, then verify.
-- ============================================================

-- ─── Shared helper: platform admin scope (admin OR super_admin) ───
CREATE OR REPLACE FUNCTION public.has_admin_scope(p_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(p_uid, 'admin'::public.app_role)
      OR public.has_role(p_uid, 'super_admin'::public.app_role);
$$;

-- ─── D-6: is_super_admin() reads the canonical role store ───
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

-- Backfill the legacy denormalized column (kept for any direct readers).
UPDATE public.profiles p
SET admin_level = CASE
  WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'super_admin'::public.app_role) THEN 'superadmin'
  WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'::public.app_role) THEN 'admin'
  ELSE NULL END
WHERE p.admin_level IS DISTINCT FROM (
  CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'super_admin'::public.app_role) THEN 'superadmin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'::public.app_role) THEN 'admin'
    ELSE NULL END);

-- Keep it in sync going forward (belt-and-braces behind syncAdminLevel()).
CREATE OR REPLACE FUNCTION public.sync_admin_level_from_roles()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_uid UUID := COALESCE(NEW.user_id, OLD.user_id);
  v_level TEXT;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'super_admin'::public.app_role) THEN 'superadmin'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin'::public.app_role) THEN 'admin'
    ELSE NULL END
  INTO v_level;
  UPDATE public.profiles SET admin_level = v_level, updated_at = now() WHERE id = v_uid;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_admin_level_from_roles ON public.user_roles;
CREATE TRIGGER trg_sync_admin_level_from_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_admin_level_from_roles();

-- ─── B-1: super_admin sees platform oversight tables ───
DROP POLICY IF EXISTS "Users view own dpo payments" ON public.dpo_payments;
CREATE POLICY "Users view own dpo payments"
  ON public.dpo_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_admin_scope());

DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can read all subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated
  USING (public.has_admin_scope());

DROP POLICY IF EXISTS "Admins can read revenue events" ON public.revenue_events;
CREATE POLICY "Admins can read revenue events"
  ON public.revenue_events FOR SELECT TO authenticated
  USING (public.has_admin_scope());

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_admin_scope());

DROP POLICY IF EXISTS "Admins can manage security events" ON public.security_events;
CREATE POLICY "Admins can manage security events"
  ON public.security_events FOR ALL
  USING (public.has_admin_scope());

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.has_admin_scope());

-- payments had NO admin read at all — add it.
DROP POLICY IF EXISTS "Admins and superadmins can read payments" ON public.payments;
CREATE POLICY "Admins and superadmins can read payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.has_admin_scope());

-- ─── B-2: plain admin reads the security audit log ───
DROP POLICY IF EXISTS "Admins can view security audit logs" ON public.security_audit_log;
CREATE POLICY "Admins can view security audit logs"
  ON public.security_audit_log FOR SELECT TO authenticated
  USING (public.has_admin_scope());

-- ─── B-3: institution-team access to appointments and payments ───
-- A viewer may see appointments/payments for a provider when the viewer is
-- active staff (or the admin) of an institution that employs that provider.
CREATE OR REPLACE FUNCTION public.shares_institution_with_provider(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_admin_scope(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.institution_staff sp
    WHERE sp.provider_id = p_provider_id
      AND sp.is_active
      AND (
        sp.institution_id IN (
          SELECT s.institution_id FROM public.institution_staff s
          WHERE s.provider_id = auth.uid() AND s.is_active
        )
        OR sp.institution_id IN (
          SELECT hi.id FROM public.healthcare_institutions hi
          WHERE hi.admin_id = auth.uid()
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Institution team view appointments" ON public.appointments;
CREATE POLICY "Institution team view appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.shares_institution_with_provider(provider_id));

DROP POLICY IF EXISTS "Institution team update appointments" ON public.appointments;
CREATE POLICY "Institution team update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.shares_institution_with_provider(provider_id))
  WITH CHECK (public.shares_institution_with_provider(provider_id));

DROP POLICY IF EXISTS "Institution team view payments" ON public.payments;
CREATE POLICY "Institution team view payments"
  ON public.payments FOR SELECT TO authenticated
  USING (public.shares_institution_with_provider(provider_id));

-- ─── B-5: institution approval grants institution_admin (mirrors provider trigger) ───
CREATE OR REPLACE FUNCTION public.grant_institution_admin_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Canonical role store (audited by the user_roles audit trigger).
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.applicant_id, 'institution_admin'::public.app_role, NULL)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Keep the profile in sync and mark verified.
  UPDATE public.profiles
     SET role = 'institution_admin'::public.user_role,
         is_verified = true,
         updated_at = now()
   WHERE id = NEW.applicant_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_institution_admin_on_approval ON public.institution_applications;
CREATE TRIGGER trg_grant_institution_admin_on_approval
  AFTER UPDATE OF status ON public.institution_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION public.grant_institution_admin_on_approval();

DROP TRIGGER IF EXISTS trg_grant_institution_admin_on_approval_ins ON public.institution_applications;
CREATE TRIGGER trg_grant_institution_admin_on_approval_ins
  AFTER INSERT ON public.institution_applications
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.grant_institution_admin_on_approval();

-- ─── D-2: promo-code writes are superadmin-only (matches UI intent) ───
DROP POLICY IF EXISTS "Admins manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins and superadmins read promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (public.has_admin_scope());
CREATE POLICY "Superadmins manage promo codes"
  ON public.promo_codes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Superadmins update promo codes" ON public.promo_codes;
CREATE POLICY "Superadmins update promo codes"
  ON public.promo_codes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "Superadmins delete promo codes" ON public.promo_codes;
CREATE POLICY "Superadmins delete promo codes"
  ON public.promo_codes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
