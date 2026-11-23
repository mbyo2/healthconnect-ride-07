-- Swarm clinical 2026-11-23: providers could VIEW a patient's problem list
-- (SELECT policy via has_care_relationship) but no policy allowed them to
-- INSERT or UPDATE, so ProblemList.tsx "Add problem" / "Mark resolved"
-- failed live with 42501 for every clinician. Additive policies only,
-- gated on the same SECURITY DEFINER care-relationship helper as SELECT.
CREATE POLICY "Providers with care relationship can add conditions"
  ON public.patient_conditions FOR INSERT
  WITH CHECK (public.has_care_relationship(auth.uid(), patient_id));
CREATE POLICY "Providers with care relationship can update conditions"
  ON public.patient_conditions FOR UPDATE
  USING (public.has_care_relationship(auth.uid(), patient_id))
  WITH CHECK (public.has_care_relationship(auth.uid(), patient_id));
