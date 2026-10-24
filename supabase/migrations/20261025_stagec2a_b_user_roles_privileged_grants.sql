-- Stage C2a Cluster B — P2-11: plain `admin` could grant/revoke
-- almost any role in user_roles.
--
-- Live state before this migration (ALL policies on user_roles were
-- enumerated first, per the permissive-OR rule):
--   SELECT  "Admins can view all role assignments"  admin OR super_admin
--   SELECT  "Users can view their own roles"         user_id = auth.uid()
--   SELECT  "user_roles_select_own"                  user_id = auth.uid()
--   INSERT  "Admins can grant non-admin roles"       has_role(admin) AND
--           role NOT IN (admin, super_admin) AND user_id <> auth.uid()
--   INSERT  "Super admins can grant any role"        has_role(super_admin)
--   DELETE  "Admins can revoke non-admin roles"      (same shape as INSERT)
--   DELETE  "Super admins can revoke any role"       has_role(super_admin)
--   (no UPDATE policies exist)
--
-- A plain admin could mint finance_manager / institution_admin /
-- hr_manager for an accomplice (money, tenant-root and payroll
-- authority) or revoke an on-call clinician (lockout DoS).
--
-- Fix: the privileged role set — admin, super_admin,
-- institution_admin, finance_manager, hr_manager — is grantable and
-- revocable by platform super_admin ONLY. Plain admins keep day-to-day
-- clinical/operational grants (doctor, nurse, pharmacist, …).
--
-- App compatibility (checked in src): RoleManagement.tsx and
-- UserManagement.tsx already refuse admin/super_admin assignment for
-- non-super-admins in the client and route every other grant through
-- these same policies; the create-admin-user edge function uses the
-- service role and is unaffected; the signup trigger (DEFINER) that
-- grants the baseline patient role is unaffected. The client guard is
-- extended to the full privileged set in the same stage (client-side
-- only; this migration is the binding control).

DROP POLICY IF EXISTS "Admins can grant non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke non-admin roles" ON public.user_roles;

CREATE POLICY "Admins can grant non-privileged roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> ALL (ARRAY[
      'admin','super_admin','institution_admin','finance_manager','hr_manager'
    ]::public.app_role[])
    AND user_id <> auth.uid()
  );

CREATE POLICY "Admins can revoke non-privileged roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> ALL (ARRAY[
      'admin','super_admin','institution_admin','finance_manager','hr_manager'
    ]::public.app_role[])
    AND user_id <> auth.uid()
  );
