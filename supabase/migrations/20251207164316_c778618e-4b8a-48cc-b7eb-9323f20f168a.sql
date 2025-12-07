-- Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create a SECURITY DEFINER function to check admin status using profiles table (not user_roles)
CREATE OR REPLACE FUNCTION public.is_admin_via_profiles(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = check_user_id 
    AND admin_level IN ('admin', 'superadmin')
  );
$$;

-- Create simple non-recursive policies
-- Users can view their own roles (direct comparison, no subquery)
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles (uses profiles table via security definer function)
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
USING (public.is_admin_via_profiles(auth.uid()));

-- Admins can insert roles
CREATE POLICY "user_roles_insert_admin"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin_via_profiles(auth.uid()));

-- Admins can update roles
CREATE POLICY "user_roles_update_admin"
ON public.user_roles
FOR UPDATE
USING (public.is_admin_via_profiles(auth.uid()));

-- Admins can delete roles
CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
USING (public.is_admin_via_profiles(auth.uid()));