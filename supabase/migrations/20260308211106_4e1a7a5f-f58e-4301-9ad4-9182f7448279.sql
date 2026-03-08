
-- Fix ambulance_dispatches RLS to be more restrictive
DROP POLICY IF EXISTS "Authenticated can manage dispatches" ON public.ambulance_dispatches;
CREATE POLICY "Staff can manage dispatches" ON public.ambulance_dispatches
  FOR ALL TO authenticated
  USING (
    dispatcher_id = auth.uid() 
    OR crew_lead_id = auth.uid()
    OR (institution_id IS NOT NULL AND public.is_institution_staff_member(institution_id))
  )
  WITH CHECK (
    dispatcher_id = auth.uid() 
    OR crew_lead_id = auth.uid()
    OR (institution_id IS NOT NULL AND public.is_institution_staff_member(institution_id))
  );
