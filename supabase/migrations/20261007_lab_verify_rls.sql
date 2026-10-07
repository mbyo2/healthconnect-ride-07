-- Allow lab technicians and pathologists to verify lab test results
--
-- BUG (found 2026-10-07 via live lab workflow test): clicking "Verify & Sign
-- Off" on a completed lab test fails with "Failed to verify result". Root
-- cause: the only UPDATE policy on lab_tests ("Phlebotomists can update
-- sample collection") covers just the phlebotomist role, so lab technicians
-- and pathologists are RLS-blocked from setting verified_by/verified_at.
--
-- FIX: UPDATE policy for lab_technician and pathologist roles. Verification
-- is restricted to tests at the staffer's own institution (via lab_id) to
-- prevent cross-institution sign-offs.

DROP POLICY IF EXISTS "Lab staff can verify results" ON public.lab_tests;
CREATE POLICY "Lab staff can verify results"
  ON public.lab_tests FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'lab_technician'::app_role)
     OR public.has_role(auth.uid(), 'pathologist'::app_role))
    AND (
      lab_id IN (
        SELECT s.institution_id FROM public.institution_staff s
        WHERE s.provider_id = auth.uid() AND s.is_active
      )
      OR lab_id IN (
        SELECT hi.id FROM public.healthcare_institutions hi
        WHERE hi.admin_id = auth.uid()
      )
      OR public.has_admin_scope(auth.uid())
    )
  )
  WITH CHECK (
    (public.has_role(auth.uid(), 'lab_technician'::app_role)
     OR public.has_role(auth.uid(), 'pathologist'::app_role))
  );

COMMENT ON POLICY "Lab staff can verify results" ON public.lab_tests IS
  'Lets lab technicians and pathologists sign off results at their own institution.';
