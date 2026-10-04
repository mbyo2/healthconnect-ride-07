-- Drift catchup: 6 legacy vital_signs CHECK constraints
-- These were applied directly to production (not via migrations).
-- This migration documents them in the repo for schema parity.
-- Idempotent: skips constraints that already exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_blood_pressure_diastolic_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_blood_pressure_diastolic_check
      CHECK ((blood_pressure_diastolic > 0) AND (blood_pressure_diastolic < 200));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_blood_pressure_systolic_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_blood_pressure_systolic_check
      CHECK ((blood_pressure_systolic > 0) AND (blood_pressure_systolic < 300));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_heart_rate_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_heart_rate_check
      CHECK ((heart_rate > 0) AND (heart_rate < 300));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_oxygen_saturation_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_oxygen_saturation_check
      CHECK ((oxygen_saturation >= 0) AND (oxygen_saturation <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_respiratory_rate_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_respiratory_rate_check
      CHECK ((respiratory_rate > 0) AND (respiratory_rate < 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vital_signs_temperature_check'
    AND conrelid = 'public.vital_signs'::regclass
  ) THEN
    ALTER TABLE public.vital_signs
      ADD CONSTRAINT vital_signs_temperature_check
      CHECK ((temperature > 30::numeric) AND (temperature < 45::numeric));
  END IF;
END $$;

COMMENT ON CONSTRAINT vital_signs_blood_pressure_diastolic_check ON public.vital_signs IS
  'Legacy constraint (applied directly to prod 2024): diastolic BP 0-200';
