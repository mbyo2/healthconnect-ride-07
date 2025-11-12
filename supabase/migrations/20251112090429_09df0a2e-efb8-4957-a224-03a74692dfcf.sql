-- Phase 1b: Create user_roles table, policies, and functions

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can grant roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles table
INSERT INTO public.user_roles (user_id, role, granted_at)
SELECT 
  id as user_id,
  role::text::app_role,
  created_at
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Create trigger function for default role
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (NEW.id, 'patient', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_user_created_assign_role ON public.profiles;
CREATE TRIGGER on_user_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();

-- Recreate audit trigger
DROP TRIGGER IF EXISTS audit_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER audit_role_assignment_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_assignment();

-- Create helper function for getting all roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(role ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'institution_admin' THEN 2
      WHEN 'health_personnel' THEN 3
      WHEN 'pharmacy' THEN 4
      WHEN 'institution_staff' THEN 5
      WHEN 'patient' THEN 6
    END
  )
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Add documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles separately for security. Users can have multiple roles. Prevents privilege escalation attacks.';