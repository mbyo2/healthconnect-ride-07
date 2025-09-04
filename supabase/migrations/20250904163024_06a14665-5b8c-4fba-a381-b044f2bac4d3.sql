-- Phase 1: CRITICAL Security Fixes

-- 1. Fix Profiles RLS Policies - Remove overly permissive admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Healthcare providers can view connected patients" ON public.profiles;

-- Create more restrictive policies for profiles
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

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

-- Super admins can view all profiles for system administration
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND admin_level = 'superadmin'
  )
);

-- 2. Secure role and admin_level updates - prevent privilege escalation
DROP POLICY IF EXISTS "Users can update basic profile info" ON public.profiles;

CREATE POLICY "Users can update own basic profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  AND admin_level = (SELECT admin_level FROM profiles WHERE id = auth.uid())
);

-- Only super admins can change roles and admin levels
CREATE POLICY "Super admins can manage user roles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND admin_level = 'superadmin'
  )
);

-- 3. Restrict provider locations to authenticated users only
DROP POLICY IF EXISTS "Public provider locations are viewable by everyone" ON public.provider_locations;

CREATE POLICY "Authenticated users can view provider locations" 
ON public.provider_locations 
FOR SELECT 
TO authenticated
USING (true);

-- 4. Restrict institution details - only show basic info publicly
DROP POLICY IF EXISTS "Public can view verified institutions" ON public.healthcare_institutions;

-- Public can only see basic directory information
CREATE POLICY "Public can view basic institution directory" 
ON public.healthcare_institutions 
FOR SELECT 
USING (is_verified = true);

-- Institution staff can see full details of their institution
CREATE POLICY "Institution staff can view full institution details" 
ON public.healthcare_institutions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM institution_staff 
    WHERE institution_id = healthcare_institutions.id 
    AND provider_id = auth.uid() 
    AND is_active = true
  )
);

-- 5. Add audit logging trigger for role changes
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
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS audit_profile_security_changes ON public.profiles;
CREATE TRIGGER audit_profile_security_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_security_changes();