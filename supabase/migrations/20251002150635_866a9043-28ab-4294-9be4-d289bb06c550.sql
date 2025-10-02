-- Phase 1: Critical Security Fixes

-- 1. Drop ALL existing policies on healthcare_institutions to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Institution staff can view full institution details" ON public.healthcare_institutions;
  DROP POLICY IF EXISTS "Staff can update institution" ON public.healthcare_institutions;
  DROP POLICY IF EXISTS "Institution admins can update institution" ON public.healthcare_institutions;
  DROP POLICY IF EXISTS "Public can view basic institution directory" ON public.healthcare_institutions;
END $$;

-- 2. Drop ALL existing policies on institution_staff
DO $$
BEGIN
  DROP POLICY IF EXISTS "Institution admins can view their staff" ON public.institution_staff;
  DROP POLICY IF EXISTS "Staff can view their own staff records" ON public.institution_staff;
  DROP POLICY IF EXISTS "Institution admins can manage their staff" ON public.institution_staff;
END $$;

-- 3. Create security definer functions (replacing old implementation)
CREATE OR REPLACE FUNCTION public.is_institution_staff_member(institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM institution_staff 
    WHERE institution_staff.institution_id = $1 
    AND institution_staff.provider_id = auth.uid() 
    AND institution_staff.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_institution_admin(institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM healthcare_institutions 
    WHERE healthcare_institutions.id = $1 
    AND healthcare_institutions.admin_id = auth.uid()
  );
$$;

-- 4. Recreate healthcare_institutions policies (non-recursive)
CREATE POLICY "Public can view verified institutions"
ON public.healthcare_institutions
FOR SELECT
USING (is_verified = true);

CREATE POLICY "Institution staff can view their institution"
ON public.healthcare_institutions
FOR SELECT
USING (public.is_institution_staff_member(id));

CREATE POLICY "Institution admins can update their institution"
ON public.healthcare_institutions
FOR UPDATE
USING (public.is_institution_admin(id));

-- 5. Recreate institution_staff policies (non-recursive)
CREATE POLICY "Staff members can view their own record"
ON public.institution_staff
FOR SELECT
USING (provider_id = auth.uid());

CREATE POLICY "Institution admins can view staff"
ON public.institution_staff
FOR SELECT
USING (public.is_institution_admin(institution_id));

CREATE POLICY "Institution admins can manage staff"
ON public.institution_staff
FOR ALL
USING (public.is_institution_admin(institution_id));

-- 6. Secure commission_settings - remove public access
DROP POLICY IF EXISTS "Users can view commission settings" ON public.commission_settings;

CREATE POLICY "Super admins only can view commission settings"
ON public.commission_settings
FOR SELECT
USING (public.is_super_admin());