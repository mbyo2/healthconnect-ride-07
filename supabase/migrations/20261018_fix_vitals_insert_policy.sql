-- Fix: Allow healthcare providers to record vitals for patients
-- The old policy only allowed users to insert their own vitals (auth.uid() = user_id)
-- This prevented nurses/doctors from recording patient vitals

DROP POLICY IF EXISTS "Users can insert their own vital signs" ON public.vital_signs;

CREATE POLICY "Users and providers can insert vital signs" ON public.vital_signs FOR INSERT
WITH CHECK (
  -- Users can insert their own vitals
  auth.uid() = user_id
  OR
  -- Healthcare providers can insert vitals for patients
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN (
      'doctor'::app_role, 'nurse'::app_role, 'clinical_officer'::app_role,
      'midwife'::app_role, 'pharmacist'::app_role
    )
  )
);
