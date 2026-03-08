
-- Fix hospital_invoices with correct column name
CREATE POLICY "Scoped invoice access"
  ON public.hospital_invoices FOR SELECT TO authenticated
  USING (
    patient_id = auth.uid()
    OR (hospital_id IS NOT NULL AND public.is_institution_staff_member(hospital_id))
    OR public.is_service_role()
  );
