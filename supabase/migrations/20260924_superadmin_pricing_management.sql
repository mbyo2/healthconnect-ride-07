-- Allow super_admin to manage subscription plans (pricing editable from the
-- Super Admin Dashboard). Run this in the Supabase SQL editor.
-- The existing policy only covered the 'admin' role; has_role() is an exact
-- match, so super_admins were blocked from updating prices.

DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;

CREATE POLICY "Admins and superadmins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );
