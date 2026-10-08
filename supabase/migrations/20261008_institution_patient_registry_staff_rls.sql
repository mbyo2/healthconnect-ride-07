-- Fix institution_patient_registry SELECT RLS to include institution_staff
-- Live bug found 2026-10-08: the policy only checked institution_personnel,
-- but staff affiliations live in institution_staff (provider_id, is_active).
-- Doctors affiliated via institution_staff could not see registry patients,
-- breaking the imaging order patient dropdown.
-- Applied live via dashboard 2026-10-08; this is the repo catch-up.

DROP POLICY IF EXISTS "Staff view institution patient registry" ON public.institution_patient_registry;

CREATE POLICY "Staff view institution patient registry"
  ON public.institution_patient_registry
  FOR SELECT
  USING (
    institution_id IN (SELECT institution_id FROM public.institution_personnel WHERE user_id = auth.uid())
    OR institution_id IN (SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid() AND is_active = true)
    OR institution_id IN (SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid())
  );
