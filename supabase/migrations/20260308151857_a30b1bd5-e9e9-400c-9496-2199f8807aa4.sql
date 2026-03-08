
-- Fix overly permissive booking_fees INSERT policy
DROP POLICY IF EXISTS "System can insert booking fees" ON public.booking_fees;

-- Only allow inserts where the patient is the authenticated user (booking for themselves)
CREATE POLICY "Patients can create booking fees via appointments"
  ON public.booking_fees FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Admin can also view all
CREATE POLICY "Admins can view all booking fees"
  ON public.booking_fees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
