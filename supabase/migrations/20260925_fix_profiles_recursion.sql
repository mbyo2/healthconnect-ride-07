-- Fix: "infinite recursion detected in policy for relation profiles"
--
-- The "Appointment participants can view each other's profiles" policy ran a
-- plain (RLS-enforcing) EXISTS query against public.appointments. At least
-- one appointments policy in turn queries public.profiles, so any profiles
-- read (e.g. the RETURNING clause of the onboarding profile upsert) cycled
-- profiles -> appointments -> profiles until Postgres aborted. This blocked
-- profile setup for every new account.
--
-- Fix: evaluate the appointment-membership check inside a SECURITY DEFINER
-- function, which bypasses RLS on the inner appointments query and breaks
-- the cycle. The policy itself keeps the same semantics: you can read your
-- own profile row, plus the profile of the other participant in any of your
-- non-cancelled appointments.

CREATE OR REPLACE FUNCTION public.user_shares_appointment_with(
  viewer_id uuid,
  other_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.status IS DISTINCT FROM 'cancelled'
      AND (
        (a.patient_id = viewer_id AND a.provider_id = other_id)
        OR (a.provider_id = viewer_id AND a.patient_id = other_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Appointment participants can view each other's profiles"
  ON public.profiles;

CREATE POLICY "Appointment participants can view each other's profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR public.user_shares_appointment_with(auth.uid(), id)
  );
