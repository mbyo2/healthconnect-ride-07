
DROP POLICY IF EXISTS "Providers with recent appointments can view medical records" ON public.comprehensive_medical_records;
CREATE POLICY "Providers with recent appointments can view medical records"
  ON public.comprehensive_medical_records FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
    OR auth.uid() = provider_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = comprehensive_medical_records.patient_id
        AND a.provider_id = auth.uid()
        AND a.status IN ('confirmed','in_progress','completed')
        AND a.date >= (CURRENT_DATE - INTERVAL '30 days')
    )
  );
