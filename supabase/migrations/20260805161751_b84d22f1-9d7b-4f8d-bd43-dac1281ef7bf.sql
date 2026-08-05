
-- 1. Consolidate overlapping profiles UPDATE policies
DROP POLICY IF EXISTS "Super admins can manage user roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile only" ON public.profiles;

CREATE POLICY "Users update own profile without privilege fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = public.get_current_user_role()
  AND admin_level IS NOT DISTINCT FROM public.get_current_user_admin_level()
);

CREATE POLICY "Admins update other profiles; only super admins change privileges"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() <> id
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  auth.uid() <> id
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  AND (
    public.is_super_admin()
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
      AND admin_level IS NOT DISTINCT FROM (SELECT p.admin_level FROM public.profiles p WHERE p.id = profiles.id)
    )
  )
);

-- 2. Allow deletion of medical record attachments by owner/provider/uploader/admin
CREATE POLICY "Record owners, providers, uploaders and admins can delete attachments"
ON public.medical_record_attachments
FOR DELETE
TO authenticated
USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1 FROM public.comprehensive_medical_records r
    WHERE r.id = medical_record_attachments.record_id
      AND (
        r.patient_id = auth.uid()
        OR r.provider_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);
GRANT DELETE ON public.medical_record_attachments TO authenticated;

-- 3. Re-assert client write lockdown on mobile money payments
REVOKE INSERT, UPDATE, DELETE ON public.mobile_money_payments FROM authenticated, anon;
GRANT SELECT ON public.mobile_money_payments TO authenticated;
GRANT ALL ON public.mobile_money_payments TO service_role;

-- 4. Re-assert that raw session tokens are never readable by clients
REVOKE ALL ON public.user_sessions FROM authenticated, anon;
GRANT SELECT (id, user_id, expires_at, last_activity, ip_address, user_agent, is_active, created_at, location, device_info) ON public.user_sessions TO authenticated;
GRANT UPDATE (last_activity, is_active), DELETE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
