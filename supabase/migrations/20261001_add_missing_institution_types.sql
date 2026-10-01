-- Add missing institution type enum values to support all 33 INSTITUTION_TYPE_OPTIONS
-- The code defines 33 types but the DB enum healthcare_provider_type only had 17.
-- This adds the missing values so all institution types can sign up on launch day.
-- Applied live on 2026-10-01 as separate short ALTER TYPE statements (the SQL
-- editor mangles long DO blocks). This file mirrors exactly what was applied live,
-- including 'private_practice' which was added for the solo-practice test institution.

ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'health_post';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'rural_health_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'urban_health_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'mini_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'district_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'provincial_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'tertiary_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'maternity_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'children_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'mental_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'cancer_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'cardiac_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'eye_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'orthopaedic_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'dialysis_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'physiotherapy_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'retail_pharmacy';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'hospital_pharmacy';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'health_shop';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'imaging_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'diagnostic_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'blood_bank';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'hospice';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'home_care';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'rehabilitation_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'private_practice';
