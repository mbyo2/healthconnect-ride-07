-- RLS for institution_procedure_pricing
--
-- CONTEXT (2026-10-07): the table has RLS enabled but zero policies, so no
-- institution can read or manage its own procedure prices. The Clinical
-- Procedure Pricing UI needs institution admins/staff to manage their rows.

-- Institutions read their own pricing
DROP POLICY IF EXISTS "Institutions read own procedure pricing" ON public.institution_procedure_pricing;
CREATE POLICY "Institutions read own procedure pricing"
  ON public.institution_procedure_pricing FOR SELECT TO authenticated
  USING (
    institution_id IN (
      SELECT s.institution_id FROM public.institution_staff s
      WHERE s.provider_id = auth.uid() AND s.is_active
    )
    OR institution_id IN (
      SELECT hi.id FROM public.healthcare_institutions hi
      WHERE hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid())
  );

-- Institution admins manage their own pricing
DROP POLICY IF EXISTS "Institution admins manage procedure pricing" ON public.institution_procedure_pricing;
CREATE POLICY "Institution admins manage procedure pricing"
  ON public.institution_procedure_pricing FOR ALL TO authenticated
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

COMMENT ON POLICY "Institution admins manage procedure pricing" ON public.institution_procedure_pricing IS
  'Lets institution admins set their own clinical procedure prices (overriding defaults).';
