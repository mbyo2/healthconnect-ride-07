-- Add missing institution type enum values to support all 33 INSTITUTION_TYPE_OPTIONS
-- The code defines 33 types but the DB enum healthcare_provider_type only had 17.
-- This adds the 25 missing values so all institution types can sign up on launch day.

DO $$
DECLARE
  v TEXT;
  missing TEXT[] := ARRAY[
    'health_post',
    'rural_health_centre',
    'urban_health_centre',
    'mini_hospital',
    'district_hospital',
    'provincial_hospital',
    'tertiary_hospital',
    'maternity_hospital',
    'children_hospital',
    'mental_hospital',
    'cancer_hospital',
    'cardiac_hospital',
    'eye_hospital',
    'orthopaedic_hospital',
    'dialysis_centre',
    'physiotherapy_centre',
    'retail_pharmacy',
    'hospital_pharmacy',
    'health_shop',
    'imaging_centre',
    'diagnostic_centre',
    'blood_bank',
    'hospice',
    'home_care',
    'rehabilitation_centre'
  ];
BEGIN
  FOREACH v IN ARRAY missing
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'healthcare_provider_type'
      AND e.enumlabel = v
    ) THEN
      EXECUTE format('ALTER TYPE public.healthcare_provider_type ADD VALUE %L', v);
    END IF;
  END LOOP;
END $$;
