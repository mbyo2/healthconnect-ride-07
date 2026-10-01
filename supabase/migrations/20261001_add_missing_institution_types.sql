-- Add missing institution type enum values to support all institution types
-- The signup form loads 54 types from the institution_types table.
-- This adds all values so every type in the form can sign up on launch day.
-- Applied live on 2026-10-01 as separate short ALTER TYPE statements (the SQL
-- editor mangles long DO blocks). This file mirrors exactly what was applied live.

-- Original 33 from INSTITUTION_TYPE_OPTIONS (plus private_practice for tests)
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

-- Additional 21 from institution_types table (form shows 54, not 33)
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'central_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'childrens_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'community_pharmacy';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'day_surgery_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'diagnostic_center';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'diagnostic_laboratory';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'fertility_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'general_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'health_screening_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'large_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'pathology_lab';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'pharmacy';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'psychiatric_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'radiology_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'specialized_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'specialized_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'surgical_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'teaching_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'trauma_centre';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'university_hospital';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'vaccination_centre';
