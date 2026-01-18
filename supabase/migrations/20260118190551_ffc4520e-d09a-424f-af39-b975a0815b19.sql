-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Only superadmins can manage user roles" ON public.user_roles;

-- The existing policies using has_role() function are correct:
-- - "Admins can assign roles" (INSERT with has_role check)
-- - "Admins can grant roles" (INSERT with has_role check)  
-- - "Admins can revoke roles" (DELETE with has_role check)
-- - "Users can view their own roles" (SELECT for own roles)
-- - Various admin policies using is_admin_via_profiles

-- These function-based policies avoid the infinite recursion issue