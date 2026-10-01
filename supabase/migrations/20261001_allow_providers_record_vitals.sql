-- Allow healthcare providers to record vitals for patients
-- Nurses, doctors, and other clinical staff need to record vital signs
-- for patients during consultations, not just for themselves.

CREATE POLICY "Providers can record patient vital signs"
ON public.vital_signs
FOR INSERT
WITH CHECK (
  -- Provider is recording for a patient (user_id is the patient)
  -- and the provider has an active appointment with that patient
  -- OR the provider is staff at an institution where the patient is registered
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = vital_signs.user_id
    AND a.provider_id = auth.uid()
    AND a.status IN ('scheduled', 'confirmed', 'in_progress', 'completed')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('nurse', 'registered_nurse', 'enrolled_nurse', 'midwife', 'doctor', 'specialist', 'clinical_officer', 'medical_licentiate')
  )
);
