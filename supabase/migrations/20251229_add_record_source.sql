-- Migration to add record_source to comprehensive_medical_records
-- Created: 2025-12-29

ALTER TABLE comprehensive_medical_records
ADD COLUMN IF NOT EXISTS record_source TEXT DEFAULT 'provider' CHECK (record_source IN ('provider', 'patient', 'device'));

-- Update existing records to be 'provider' by default (or 'patient' if provider_id is null)
UPDATE comprehensive_medical_records
SET record_source = CASE
    WHEN provider_id IS NULL THEN 'patient'
    ELSE 'provider'
END
WHERE record_source IS NULL;
