-- Add currency column to healthcare_institutions
ALTER TABLE public.healthcare_institutions
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ZMW' CHECK (currency IN ('ZMW', 'USD'));

-- Update existing records to have ZMW as default
UPDATE public.healthcare_institutions
SET currency = 'ZMW'
WHERE currency IS NULL;
