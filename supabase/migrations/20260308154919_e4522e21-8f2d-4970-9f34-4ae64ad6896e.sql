
-- 1. Expand healthcare_provider_type enum with specialty clinic types
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'optician';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'dermatology_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'physiotherapy';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'radiology_center';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'eye_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'skin_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'dental_clinic';
ALTER TYPE public.healthcare_provider_type ADD VALUE IF NOT EXISTS 'specialty_clinic';

-- 2. Create a reference table for clinic specialties (the catalog)
CREATE TABLE IF NOT EXISTS public.clinic_specialty_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed initial specialties
INSERT INTO public.clinic_specialty_catalog (name, description, icon_name) VALUES
  ('Dental Care', 'General and specialist dental services', 'Stethoscope'),
  ('Optician / Eye Care', 'Vision testing, glasses, contact lenses', 'Eye'),
  ('Dermatology / Skin Care', 'Skin conditions, cosmetic dermatology', 'Sparkles'),
  ('Physiotherapy', 'Physical rehabilitation and therapy', 'Activity'),
  ('Radiology / Imaging', 'X-ray, MRI, CT scans, ultrasound', 'Scan'),
  ('Pediatrics', 'Child health and development', 'Baby'),
  ('Orthopedics', 'Bone, joint, and muscle care', 'Bone'),
  ('Cardiology', 'Heart and cardiovascular care', 'Heart'),
  ('ENT (Ear Nose Throat)', 'Ear, nose, and throat specialist services', 'Ear'),
  ('Mental Health / Counseling', 'Psychiatry, psychology, counseling', 'Brain'),
  ('Gynecology / Women Health', 'Women reproductive health', 'Users'),
  ('Urology', 'Urinary tract and male reproductive health', 'Droplets'),
  ('General Practice', 'Primary care and general consultations', 'Stethoscope'),
  ('Laboratory Services', 'Blood tests, pathology, diagnostics', 'FlaskConical')
ON CONFLICT (name) DO NOTHING;

-- 3. Junction table: which specialties does an institution offer
CREATE TABLE IF NOT EXISTS public.institution_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.clinic_specialty_catalog(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(institution_id, specialty_id)
);

-- 4. Specialty-specific staff roles catalog
CREATE TABLE IF NOT EXISTS public.specialty_staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid NOT NULL REFERENCES public.clinic_specialty_catalog(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  description text,
  requires_license boolean DEFAULT true,
  is_clinical boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(specialty_id, role_name)
);

-- Seed specialty-specific roles
INSERT INTO public.specialty_staff_roles (specialty_id, role_name, description, requires_license, is_clinical) VALUES
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dental Care'), 'Dentist', 'Licensed dental practitioner', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dental Care'), 'Dental Hygienist', 'Teeth cleaning and preventive care', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dental Care'), 'Dental Assistant', 'Assists dentist during procedures', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dental Care'), 'Dental Technician', 'Creates dental prosthetics and devices', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dental Care'), 'Orthodontist', 'Braces and teeth alignment specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Optician / Eye Care'), 'Optometrist', 'Eye examinations and prescriptions', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Optician / Eye Care'), 'Optician', 'Fits and dispenses corrective lenses', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Optician / Eye Care'), 'Ophthalmologist', 'Eye surgeon and medical specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Optician / Eye Care'), 'Ophthalmic Technician', 'Assists with eye tests and equipment', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dermatology / Skin Care'), 'Dermatologist', 'Skin specialist physician', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dermatology / Skin Care'), 'Esthetician', 'Skin care treatments and facials', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Dermatology / Skin Care'), 'Dermatology Nurse', 'Nursing care for skin conditions', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Physiotherapy'), 'Physiotherapist', 'Physical rehabilitation specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Physiotherapy'), 'Physical Therapy Assistant', 'Assists physiotherapist with exercises', false, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Physiotherapy'), 'Sports Therapist', 'Athletic injury rehabilitation', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Radiology / Imaging'), 'Radiologist', 'Interprets medical images', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Radiology / Imaging'), 'Radiographer', 'Operates imaging equipment', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'Radiology / Imaging'), 'Sonographer', 'Ultrasound specialist', true, true),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Practice'), 'Receptionist', 'Front desk and scheduling', false, false),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Practice'), 'Practice Manager', 'Clinic operations management', false, false),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Practice'), 'Billing Coordinator', 'Insurance and billing management', false, false),
  ((SELECT id FROM clinic_specialty_catalog WHERE name = 'General Practice'), 'Nurse', 'General nursing support', true, true)
ON CONFLICT (specialty_id, role_name) DO NOTHING;

-- 5. Link institution staff to specific specialty roles
ALTER TABLE public.institution_staff 
  ADD COLUMN IF NOT EXISTS specialty_role_id uuid REFERENCES public.specialty_staff_roles(id),
  ADD COLUMN IF NOT EXISTS specialty_id uuid REFERENCES public.clinic_specialty_catalog(id);

-- 6. RLS policies
ALTER TABLE public.clinic_specialty_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read specialty catalog"
  ON public.clinic_specialty_catalog FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read specialty staff roles"
  ON public.specialty_staff_roles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view institution specialties"
  ON public.institution_specialties FOR SELECT
  USING (true);

CREATE POLICY "Institution admin can manage specialties"
  ON public.institution_specialties FOR ALL
  TO authenticated
  USING (public.is_institution_admin(institution_id) OR public.is_super_admin())
  WITH CHECK (public.is_institution_admin(institution_id) OR public.is_super_admin());

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_institution_specialties_institution 
  ON public.institution_specialties(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_specialties_specialty 
  ON public.institution_specialties(specialty_id);
CREATE INDEX IF NOT EXISTS idx_specialty_staff_roles_specialty 
  ON public.specialty_staff_roles(specialty_id);
CREATE INDEX IF NOT EXISTS idx_institution_staff_specialty 
  ON public.institution_staff(specialty_id);
