-- Allow institutions to add their own custom procedures
--
-- CONTEXT (2026-10-07): institutions need to define procedures beyond the 11
-- system ones, with their own pricing. Add institution_id to
-- clinical_procedures: NULL = system-wide catalog, set = institution-specific.

ALTER TABLE public.clinical_procedures
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE;

-- Institutions can view system procedures + their own custom ones
DROP POLICY IF EXISTS "View system and own procedures" ON public.clinical_procedures;
CREATE POLICY "View system and own procedures"
  ON public.clinical_procedures FOR SELECT TO authenticated
  USING (
    institution_id IS NULL
    OR institution_id IN (
      SELECT s.institution_id FROM public.institution_staff s
      WHERE s.provider_id = auth.uid() AND s.is_active
    )
    OR institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  );

-- Institution admins can add custom procedures for their institution
DROP POLICY IF EXISTS "Institution admins add custom procedures" ON public.clinical_procedures;
CREATE POLICY "Institution admins add custom procedures"
  ON public.clinical_procedures FOR INSERT TO authenticated
  WITH CHECK (
    institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  );

-- Institution admins can update/delete their own custom procedures
DROP POLICY IF EXISTS "Institution admins manage custom procedures" ON public.clinical_procedures;
CREATE POLICY "Institution admins manage custom procedures"
  ON public.clinical_procedures FOR ALL TO authenticated
  USING (
    institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  )
  WITH CHECK (
    institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  );

COMMENT ON COLUMN public.clinical_procedures.institution_id IS
  'NULL = system-wide procedure; set = custom procedure owned by that institution.';
