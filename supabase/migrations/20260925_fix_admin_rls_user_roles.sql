-- Fix admin RLS policies that checked the legacy profiles.admin_level column.
--
-- Root cause: roles are granted/revoked through the Role Management UI, which only
-- writes to public.user_roles. Several RLS policies (and is_superadmin()) instead
-- checked profiles.admin_level, a denormalized column that nothing keeps in sync.
-- Result: admins could not read other users' profiles, so the provider/institution
-- application review screens showed blank applicant names/emails and no application
-- could ever be approved -> providers stayed unverified -> invisible in patient
-- search -> no bookings possible.
--
-- Fix: (1) backfill admin_level from user_roles for legacy readers,
-- (2) rewrite the affected policies/functions to use the has_role() SECURITY
-- DEFINER check against public.user_roles (the real source of truth).

-- 1. Backfill legacy admin_level from user_roles
UPDATE public.profiles p
SET admin_level = 'superadmin'::public.admin_level
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'super_admin'
)
AND (p.admin_level IS DISTINCT FROM 'superadmin'::public.admin_level);

UPDATE public.profiles p
SET admin_level = 'admin'::public.admin_level
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'super_admin'
)
AND (p.admin_level IS DISTINCT FROM 'admin'::public.admin_level);

-- 2. is_superadmin() must consult user_roles, not the stale column
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

-- 3. Admins can view all profiles (used by application review screens)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- 4. Super admins can view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- 5. Super admins can manage user roles (profile updates)
DROP POLICY IF EXISTS "Super admins can manage user roles" ON public.profiles;
CREATE POLICY "Super admins can manage user roles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- 6. Admins can view all audit logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;
CREATE POLICY "Admins can view all audit logs"
ON public.security_audit_log FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- 7. Admins and patients can manage primary provider assignments
DROP POLICY IF EXISTS "Admins and patients can manage primary provider assignments" ON public.primary_provider_assignments;
CREATE POLICY "Admins and patients can manage primary provider assignments"
ON public.primary_provider_assignments FOR ALL
USING (
  auth.uid() = patient_id OR
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
