-- Allow pharmacists and pharmacy staff to view prescriptions
-- This fixes the critical bug where pharmacists couldn't see the prescription queue

-- Pharmacists can view all pending prescriptions (their work queue)
CREATE POLICY "pharmacy_prescriptions_pharmacist_select" ON public.pharmacy_prescriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'pharmacist'::app_role
  )
);

-- Pharmacists can update prescriptions (mark as filled)
CREATE POLICY "pharmacy_prescriptions_pharmacist_update" ON public.pharmacy_prescriptions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'pharmacist'::app_role
  )
);
