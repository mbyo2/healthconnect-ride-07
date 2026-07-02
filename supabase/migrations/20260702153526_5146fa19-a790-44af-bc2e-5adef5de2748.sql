
-- audit_logs: remove self-insert; only service_role writes
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (public.is_service_role());

-- security_audit_log: only service_role writes
DROP POLICY IF EXISTS "Users can insert own security logs" ON public.security_audit_log;

CREATE POLICY "Service role can insert security logs"
  ON public.security_audit_log
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (public.is_service_role());

-- user_badges: users may no longer self-award; only service_role
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;

CREATE POLICY "Service role can award badges"
  ON public.user_badges
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (public.is_service_role());

-- profiles: remove broad connected-view SELECT that exposed full row PII.
-- Consumers should use public.get_public_profile(uuid) which returns only safe columns.
DROP POLICY IF EXISTS "Connected view limited info" ON public.profiles;

-- provider_time_slots: patients need to read available slots to book
CREATE POLICY "Authenticated can view available time slots"
  ON public.provider_time_slots
  FOR SELECT
  TO authenticated
  USING (is_available = true);
