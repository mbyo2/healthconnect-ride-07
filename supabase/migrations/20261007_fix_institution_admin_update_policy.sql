-- Fix institution admin update policy to not depend on profiles.admin_level
-- (which has a DB anomaly preventing UPDATEs from persisting).
-- Use healthcare_institutions.admin_id directly instead.

DROP POLICY IF EXISTS "Institution admins can update their institution" ON public.healthcare_institutions;

CREATE POLICY "Institution admins can update their institution"
ON public.healthcare_institutions FOR UPDATE
TO authenticated
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());
