
DROP POLICY IF EXISTS "Institution admins can view their institution" ON public.healthcare_institutions;
DROP POLICY IF EXISTS "Super admins can view all institutions" ON public.healthcare_institutions;

CREATE POLICY "Institution admins can view their institution"
  ON public.healthcare_institutions
  FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Super admins can view all institutions"
  ON public.healthcare_institutions
  FOR SELECT
  USING (public.is_super_admin());
