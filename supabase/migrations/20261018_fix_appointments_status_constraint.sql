-- Fix appointments status CHECK constraint to include 'pending'
-- The app code inserts appointments with status='pending' but the original
-- constraint only allowed ('scheduled', 'cancelled', 'completed')

DO $$
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  
  -- Add the corrected constraint with 'pending' included
  ALTER TABLE public.appointments 
    ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('pending', 'scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'));
END $$;
