-- Fix: "Failed to load admin users" on the Super Admin dashboard.
--
-- The user_roles SELECT policies only let a user see their OWN roles, plus a
-- FOR ALL policy whose check looks for role = 'admin' (missing 'super_admin').
-- A superadmin (role 'super_admin' in user_roles) therefore could not list
-- role assignments, so the Admin & Superadmin Management table failed or
-- showed zero admins.
--
-- has_role() is SECURITY DEFINER (bypasses RLS, no recursion), so this is safe.

DROP POLICY IF EXISTS "Admins can view all role assignments" ON public.user_roles;
CREATE POLICY "Admins can view all role assignments"
ON public.user_roles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);
