-- Fix infinite recursion in RLS policies by using security definer functions

-- Drop the problematic policies
DROP POLICY IF EXISTS "Connected providers can view patient basic info only" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage user roles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own basic profile only" ON public.profiles;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_admin_level()
RETURNS admin_level
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT admin_level FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT COALESCE((SELECT admin_level FROM public.profiles WHERE id = auth.uid()) = 'superadmin', false);
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Connected providers can view patient basic info only" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT patient_id FROM user_connections 
    WHERE provider_id = auth.uid() 
    AND status = 'approved'
  ) 
  OR 
  id IN (
    SELECT provider_id FROM user_connections 
    WHERE patient_id = auth.uid() 
    AND status = 'approved'
  )
);

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_super_admin());

CREATE POLICY "Users can update own basic profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = public.get_current_user_role()
  AND admin_level = public.get_current_user_admin_level()
);

CREATE POLICY "Super admins can manage user roles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_super_admin());

-- Fix the search path issue in the audit function
CREATE OR REPLACE FUNCTION public.audit_security_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any role or admin_level changes
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.admin_level IS DISTINCT FROM NEW.admin_level THEN
    INSERT INTO public.security_audit_log (
      user_id,
      event_type,
      event_data,
      ip_address,
      user_agent
    ) VALUES (
      NEW.id,
      'role_change',
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'old_admin_level', OLD.admin_level,
        'new_admin_level', NEW.admin_level,
        'changed_by', auth.uid(),
        'timestamp', now()
      ),
      inet_client_addr(),
      COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'extensions';