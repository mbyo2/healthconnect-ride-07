-- Add verified_at to lab_tests for pathologist sign-off tracking
ALTER TABLE public.lab_tests 
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
