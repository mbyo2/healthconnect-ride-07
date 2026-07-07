
-- comprehensive_medical_records
DROP POLICY IF EXISTS "Patients can update their own medical records" ON public.comprehensive_medical_records;
CREATE POLICY "Patients can update their own medical records"
ON public.comprehensive_medical_records
FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Providers can update records they created" ON public.comprehensive_medical_records;
CREATE POLICY "Providers can update records they created"
ON public.comprehensive_medical_records
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- appointments
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
CREATE POLICY "Users can update own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = patient_id OR auth.uid() = provider_id)
WITH CHECK (auth.uid() = patient_id OR auth.uid() = provider_id);

-- comprehensive_prescriptions
DROP POLICY IF EXISTS "Providers can update prescriptions they wrote" ON public.comprehensive_prescriptions;
CREATE POLICY "Providers can update prescriptions they wrote"
ON public.comprehensive_prescriptions
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

DROP POLICY IF EXISTS "Pharmacies can update prescription status" ON public.comprehensive_prescriptions;
CREATE POLICY "Pharmacies can update prescription status"
ON public.comprehensive_prescriptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id
      AND hi.admin_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = comprehensive_prescriptions.pharmacy_id
      AND hi.admin_id = auth.uid()
  )
);

-- appointment_waitlist
DROP POLICY IF EXISTS "Patients update own waitlist" ON public.appointment_waitlist;
CREATE POLICY "Patients update own waitlist"
ON public.appointment_waitlist
FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Providers update their waitlist" ON public.appointment_waitlist;
CREATE POLICY "Providers update their waitlist"
ON public.appointment_waitlist
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);
