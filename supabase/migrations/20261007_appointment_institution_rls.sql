-- Allow institution staff to view/update appointments linked to their institution
--
-- BUG (found 2026-10-07 via live receptionist test): the "Institution team
-- view appointments" policy only allows viewing when the staffer shares an
-- institution with the appointment's PROVIDER (via institution_staff).
-- Appointments linked to the institution via institution_id (set at booking
-- time by trg_set_appointment_institution) but with a provider from another
-- institution remain invisible to the institution's own receptionists.
--
-- FIX: additional policies granting SELECT/UPDATE on appointments whose
-- institution_id matches one of the viewer's staff/admin institutions.

DROP POLICY IF EXISTS "Institution staff view linked appointments" ON public.appointments;
CREATE POLICY "Institution staff view linked appointments"
  ON public.appointments FOR SELECT TO authenticated
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

DROP POLICY IF EXISTS "Institution staff update linked appointments" ON public.appointments;
CREATE POLICY "Institution staff update linked appointments"
  ON public.appointments FOR UPDATE TO authenticated
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
  )
  WITH CHECK (
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

COMMENT ON POLICY "Institution staff view linked appointments" ON public.appointments IS
  'Lets institution staff/admins see appointments linked to their institution via institution_id, even when the provider belongs elsewhere.';
