-- Let institution staff see patient profiles they have a legitimate relationship with
--
-- BUG (found 2026-10-07 via live receptionist test): the institution
-- appointments page shows booked appointments, but patient/provider name
-- columns render blank. Root cause: profiles SELECT RLS has no policy for
-- institution staff — "Appointment participants can view each other's
-- profiles" only covers direct patient↔provider pairs, so the joined
-- profiles come back null for receptionists.
--
-- FIX: new SELECT policy covering patients with appointments linked to the
-- staffer's institution (booked, not cancelled) or queue tokens there.
-- Staff still cannot enumerate unrelated patients.
--
-- NOTE: an earlier version of this policy also called
-- has_patient_relationship(id); it caused intermittent "Failed to load
-- appointments" errors on the institution appointments page and was replaced
-- with these direct EXISTS checks (2026-10-07).

DROP POLICY IF EXISTS "Institution staff view related patient profiles" ON public.profiles;
CREATE POLICY "Institution staff view related patient profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.patient_id = profiles.id
        AND a.status IS DISTINCT FROM 'cancelled'
        AND (
          a.institution_id IN (
            SELECT s.institution_id FROM public.institution_staff s
            WHERE s.provider_id = auth.uid() AND s.is_active
          )
          OR a.institution_id IN (
            SELECT hi.id FROM public.healthcare_institutions hi
            WHERE hi.admin_id = auth.uid()
          )
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.queue_tokens qt
      WHERE qt.patient_id = profiles.id
        AND qt.institution_id IN (
          SELECT s.institution_id FROM public.institution_staff s
          WHERE s.provider_id = auth.uid() AND s.is_active
        )
    )
  );

COMMENT ON POLICY "Institution staff view related patient profiles" ON public.profiles IS
  'Lets receptionists and institution staff see names of patients with appointments or queue tokens at their institution. Does not permit enumerating unrelated patients.';
