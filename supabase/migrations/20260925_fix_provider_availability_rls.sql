-- Fix: doctors had no working way to set their working hours.
-- provider_availability only had a SELECT policy, so the availability editor
-- (now wired into the provider dashboard) could never save time slots.
-- Providers manage their own rows; patients (authenticated) can read all
-- schedules to find bookable clinicians.

DROP POLICY IF EXISTS "Providers can manage their own availability" ON public.provider_availability;
CREATE POLICY "Providers can manage their own availability"
ON public.provider_availability FOR ALL TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());
