
-- Allow admins/super_admins to update healthcare institutions (e.g., is_verified)
DROP POLICY IF EXISTS "Admins can update institutions" ON public.healthcare_institutions;
CREATE POLICY "Admins can update institutions"
ON public.healthcare_institutions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Allow admins/super_admins to view all institutions (including unverified)
DROP POLICY IF EXISTS "Admins can view all institutions" ON public.healthcare_institutions;
CREATE POLICY "Admins can view all institutions"
ON public.healthcare_institutions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Allow admins/super_admins to update any profile (to set is_verified, etc.)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Super admins can also manage provider applications
DROP POLICY IF EXISTS "Super admins can update provider applications" ON public.health_personnel_applications;
CREATE POLICY "Super admins can update provider applications"
ON public.health_personnel_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view provider applications" ON public.health_personnel_applications;
CREATE POLICY "Super admins can view provider applications"
ON public.health_personnel_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins/super admins can manage institution applications
DROP POLICY IF EXISTS "Admins can update institution applications" ON public.institution_applications;
CREATE POLICY "Admins can update institution applications"
ON public.institution_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can view institution applications" ON public.institution_applications;
CREATE POLICY "Admins can view institution applications"
ON public.institution_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admins/super admins can read uploaded registration documents
DROP POLICY IF EXISTS "Admins can read registration documents" ON storage.objects;
CREATE POLICY "Admins can read registration documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'registration_documents'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);
