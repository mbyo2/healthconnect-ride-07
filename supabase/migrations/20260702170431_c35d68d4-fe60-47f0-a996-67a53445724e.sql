
-- 1) login_security_log
DROP POLICY IF EXISTS "Admins can view login security log" ON public.login_security_log;
CREATE POLICY "Institution admins view their users' login events"
  ON public.login_security_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      public.has_role(auth.uid(), 'admin'::app_role)
      AND login_security_log.user_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.institution_staff caller
        JOIN public.institution_staff target
          ON target.institution_id = caller.institution_id
        WHERE caller.provider_id = auth.uid()
          AND caller.is_active = true
          AND target.provider_id = login_security_log.user_id
          AND target.is_active = true
      )
    )
  );

-- 2) user_two_factor
DROP POLICY IF EXISTS "Users can manage their own 2FA" ON public.user_two_factor;

CREATE POLICY "Users can insert own 2FA"
  ON public.user_two_factor FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA"
  ON public.user_two_factor FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2FA"
  ON public.user_two_factor FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.user_two_factor_status
WITH (security_invoker = true) AS
SELECT user_id, enabled, created_at, updated_at
FROM public.user_two_factor
WHERE user_id = auth.uid();

GRANT SELECT ON public.user_two_factor_status TO authenticated;

-- 3) password_policies
DROP POLICY IF EXISTS "Anyone can read password policies" ON public.password_policies;
CREATE POLICY "Admins can read password policies"
  ON public.password_policies FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'institution_admin'::app_role)
  );

-- 4) hospital_billing_items
CREATE POLICY "Institution staff view hospital billing items"
  ON public.hospital_billing_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hospital_billing hb
      WHERE hb.id = hospital_billing_items.billing_id
        AND (
          public.is_institution_admin(hb.hospital_id)
          OR public.is_institution_staff(hb.hospital_id, auth.uid())
        )
    )
  );

-- 5) medical_record_audit
CREATE POLICY "Service role writes medical record audit"
  ON public.medical_record_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_service_role());

-- 6) sms_logs
CREATE POLICY "Institution admins view SMS logs"
  ON public.sms_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'institution_admin'::app_role)
  );
