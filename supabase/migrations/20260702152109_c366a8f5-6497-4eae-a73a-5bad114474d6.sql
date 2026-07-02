
-- 1) promo_codes: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;
CREATE POLICY "Authenticated can read active promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- 2) form_templates: restrict to authenticated
DROP POLICY IF EXISTS "Users can view active form templates" ON public.form_templates;
CREATE POLICY "Authenticated can view active form templates" ON public.form_templates
  FOR SELECT TO authenticated USING (is_active = true);

-- 3) profiles: remove broad colleague / connection SELECT policies
DROP POLICY IF EXISTS "Active institution colleagues can view profile" ON public.profiles;
DROP POLICY IF EXISTS "Approved connections can view limited profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  role user_role,
  specialty text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, first_name, last_name, avatar_url, role, specialty
  FROM public.profiles
  WHERE id = _user_id
    AND (
      auth.uid() = _user_id
      OR EXISTS (
        SELECT 1 FROM public.user_connections uc
        WHERE ((uc.patient_id = _user_id AND uc.provider_id = auth.uid())
            OR (uc.provider_id = _user_id AND uc.patient_id = auth.uid()))
          AND uc.status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM public.institution_staff is1
        JOIN public.institution_staff is2 ON is1.institution_id = is2.institution_id
        WHERE is1.provider_id = auth.uid()
          AND is2.provider_id = _user_id
          AND is1.is_active AND is2.is_active
      )
    );
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

-- 4) user_two_factor: never return secret / backup_codes via API
REVOKE SELECT ON public.user_two_factor FROM authenticated, anon;
GRANT SELECT (id, user_id, enabled, verified_at, created_at, updated_at)
  ON public.user_two_factor TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_two_factor TO authenticated;

-- 5) employee_records: only HR / institution admins may manage; staff can view own
DROP POLICY IF EXISTS "Institution admins can view their employee records" ON public.employee_records;
DROP POLICY IF EXISTS "Institution admins can manage their employee records" ON public.employee_records;

CREATE POLICY "HR and institution admins manage employee records"
  ON public.employee_records
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.has_role(auth.uid(), 'hr_manager')
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.has_role(auth.uid(), 'hr_manager')
  );

CREATE POLICY "Employees can view own record"
  ON public.employee_records
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid());

-- 6) payroll_records: HR / institution admin only
DROP POLICY IF EXISTS "HR can manage payroll" ON public.payroll_records;
DROP POLICY IF EXISTS "Staff can view own payroll" ON public.payroll_records;

CREATE POLICY "HR and institution admins manage payroll"
  ON public.payroll_records
  FOR ALL TO authenticated
  USING (
    public.is_institution_admin(institution_id)
    OR public.has_role(auth.uid(), 'hr_manager')
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
    OR public.has_role(auth.uid(), 'hr_manager')
  );

CREATE POLICY "Staff can view own payroll only"
  ON public.payroll_records
  FOR SELECT TO authenticated
  USING (staff_id = auth.uid());

-- 7) login_security_log: user self-select by email; admins already covered
CREATE POLICY "Users can view own login events"
  ON public.login_security_log
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- 8) Storage: avatars restricted to authenticated
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Authenticated can view avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

-- 9) Storage: receipts INSERT/UPDATE/DELETE (owner-scoped)
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = storage.filename(objects.name)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own receipts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = storage.filename(objects.name)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.payments
      WHERE payments.id::text = storage.filename(objects.name)
        AND (payments.patient_id = auth.uid() OR payments.provider_id = auth.uid())
    )
  );

-- 10) user_roles: only super_admins may grant admin/super_admin
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;

CREATE POLICY "Super admins can grant any role"
  ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    AND user_id <> auth.uid()
  );

CREATE POLICY "Admins can grant non-admin roles"
  ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND role NOT IN ('admin'::app_role, 'super_admin'::app_role)
    AND user_id <> auth.uid()
  );

CREATE POLICY "Super admins can revoke any role"
  ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can revoke non-admin roles"
  ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND role NOT IN ('admin'::app_role, 'super_admin'::app_role)
    AND user_id <> auth.uid()
  );

CREATE POLICY "Admins can view all role assignments"
  ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
