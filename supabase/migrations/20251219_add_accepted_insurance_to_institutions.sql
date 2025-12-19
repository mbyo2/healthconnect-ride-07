-- Add accepted_insurance_providers column to healthcare_institutions
ALTER TABLE healthcare_institutions
ADD COLUMN IF NOT EXISTS accepted_insurance_providers TEXT[] DEFAULT '{}';
