-- 2026-10-07: Theatre (Operating Theatre) module completion.
--
-- DESIGN NOTE: a `theatre_schedules` parallel table was considered, but the
-- repo already has `public.ot_surgeries` (created 2026-03-08) backing the
-- OTManagement component used inside HospitalManagement. A second table would
-- fragment surgery data between two stores. Instead this migration completes
-- the existing theatre store:
--   1. Add anesthetist_id + duration_minutes columns (used by the booking form).
--   2. Patients can view their own surgeries (SELECT own rows).
--   3. Mark the 'theatre' charter module live (it was 'planned' for
--      secondary/tertiary tiers even though the UI exists).
-- Applied live 2026-10-07.

-- 1. Columns used by the theatre booking form
ALTER TABLE public.ot_surgeries
  ADD COLUMN IF NOT EXISTS anesthetist_id UUID REFERENCES public.profiles(id);

ALTER TABLE public.ot_surgeries
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- 2. Patients can view their own surgeries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ot_surgeries'
      AND policyname = 'Patients can view own ot_surgeries'
  ) THEN
    CREATE POLICY "Patients can view own ot_surgeries"
      ON public.ot_surgeries FOR SELECT TO authenticated
      USING (patient_id = auth.uid());
  END IF;
END $$;

-- 3. Theatre module is live: the OTManagement UI + /theatre standalone route exist
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'theatre'
  AND status = 'planned';
