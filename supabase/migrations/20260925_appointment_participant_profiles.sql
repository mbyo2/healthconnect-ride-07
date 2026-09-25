-- Appointment participants can see each other's names.
--
-- Problem: the doctor dashboard and the patient appointments page embed
-- patient:profiles / provider:profiles on the appointments query, but RLS on
-- profiles only lets a user read their OWN row. The embed silently returned
-- null, so doctors saw "Unknown"/"Patient" and patients saw "Healthcare
-- Provider" instead of real names.
--
-- Fix: within a non-cancelled appointment relationship, each participant may
-- read the other's profile row (care-team model — a clinician must know who
-- they are treating, and a patient must know who they booked). No access
-- outside an appointment relationship.

DROP POLICY IF EXISTS "Appointment participants can view each other's profiles"
  ON public.profiles;

CREATE POLICY "Appointment participants can view each other's profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.status <> 'cancelled'
        AND a.patient_id = profiles.id
        AND a.provider_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.status <> 'cancelled'
        AND a.provider_id = profiles.id
        AND a.patient_id = auth.uid()
    )
  );
