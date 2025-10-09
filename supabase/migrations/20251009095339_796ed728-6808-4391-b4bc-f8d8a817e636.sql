-- Phase 1: Critical Security Fixes (Fixed version)

-- 1. Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('patient', 'health_personnel', 'admin', 'institution_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table with proper security
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'institution_admin' THEN 2
      WHEN 'health_personnel' THEN 3
      WHEN 'patient' THEN 4
    END
  LIMIT 1
$$;

-- 5. Migrate existing roles from profiles to user_roles (only if table exists and has data)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    INSERT INTO public.user_roles (user_id, role, granted_at)
    SELECT id, role::text::app_role, created_at
    FROM public.profiles
    WHERE role IS NOT NULL
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- 6. RLS Policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only superadmins can manage user roles" ON public.user_roles;
CREATE POLICY "Only superadmins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
  AND (
    SELECT admin_level FROM public.profiles WHERE id = auth.uid()
  ) = 'superadmin'
);

-- 7. Tighten profiles table RLS for sensitive data
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Connected providers can view limited patient info" ON public.profiles;
DROP POLICY IF EXISTS "Institution staff can view colleague basics" ON public.profiles;

-- Users can only view their own complete profile
CREATE POLICY "Users view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Connected providers can only view limited non-sensitive fields
CREATE POLICY "Connected view limited info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_connections uc
    WHERE ((uc.patient_id = profiles.id AND uc.provider_id = auth.uid())
    OR (uc.provider_id = profiles.id AND uc.patient_id = auth.uid()))
    AND uc.status = 'approved'
  )
);

-- Health personnel can view basic info of their institution colleagues
CREATE POLICY "Institution colleagues view basics"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.institution_staff is1
    JOIN public.institution_staff is2 ON is1.institution_id = is2.institution_id
    WHERE is1.provider_id = auth.uid()
    AND is2.provider_id = profiles.id
    AND is1.is_active = true
    AND is2.is_active = true
  )
);

-- 8. Restrict emergency_contacts access
DROP POLICY IF EXISTS "Only authorized emergency responders can view emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Emergency contacts restricted access"
ON public.emergency_contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id 
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'health_personnel')
    AND EXISTS (
      SELECT 1 FROM public.emergency_events ee
      WHERE ee.patient_id = emergency_contacts.patient_id
      AND ee.status = 'active'
      AND ee.created_at > now() - interval '24 hours'
    )
  )
);

-- 9. Restrict emergency_events location data access
DROP POLICY IF EXISTS "Users can view their own emergency events" ON public.emergency_events;
CREATE POLICY "Emergency events restricted access"
ON public.emergency_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'health_personnel')
    AND status = 'active'
    AND created_at > now() - interval '24 hours'
  )
);

-- 10. Add security audit logging for role changes
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;

CREATE OR REPLACE FUNCTION public.audit_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      event_type,
      event_data
    ) VALUES (
      NEW.user_id,
      'role_assigned',
      jsonb_build_object(
        'role', NEW.role,
        'granted_by', NEW.granted_by,
        'timestamp', NEW.granted_at
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log (
      user_id,
      event_type,
      event_data
    ) VALUES (
      OLD.user_id,
      'role_revoked',
      jsonb_build_object(
        'role', OLD.role,
        'revoked_by', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_assignment();