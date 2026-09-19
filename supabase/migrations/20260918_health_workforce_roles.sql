-- ============================================================================
-- Health workforce roles + facility taxonomy (HPCZ / NMCZ / ZAMRA / MOH)
-- Run in Supabase SQL Editor (or `supabase db push`). Safe to re-run.
--
-- 1. Extends the app_role + user_role enums with the 19 new workforce roles
--    used by the app taxonomy (src/config/roleConfig.ts). Values are added
--    only when missing.
-- 2. Seeds provider_types with every HPCZ/NMCZ cadre (signup dropdowns).
-- 3. Seeds institution_types with the full MOH Zambia facility pyramid +
--    private + ZAMRA premises (registration + directory filters).
-- 4. Adds video_consultations columns written by create-daily-room.
-- 5. Opens public (anon) SELECT on the three reference tables so signup
--    dropdowns work before login. No write access is granted.
--
-- NOTE: requires PostgreSQL 12+ (Supabase runs PG15) for transactional
-- enum additions.
-- ============================================================================

-- ─── 1. app_role enum ─────────────────────────────────────────────────────
DO $$
DECLARE
  v text;
  new_roles text[] := ARRAY[
    'medical_licentiate',
    'clinical_officer',
    'dentist',
    'dental_therapist',
    'registered_nurse',
    'enrolled_nurse',
    'midwife',
    'pharmacy_technologist',
    'wholesale_pharmacy',
    'radiographer',
    'physiotherapist',
    'occupational_therapist',
    'nutritionist',
    'optometrist',
    'psychologist',
    'environmental_health_officer',
    'community_health_worker',
    'traditional_practitioner',
    'medical_records_officer'
  ];
BEGIN
  FOREACH v IN ARRAY new_roles LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = v
    ) THEN
      EXECUTE format('ALTER TYPE public.app_role ADD VALUE %L', v);
    END IF;
  END LOOP;
END $$;

-- ─── 2. user_role enum (profiles.role + related tables) ───────────────────
DO $$
DECLARE
  v text;
  new_roles text[] := ARRAY[
    'institution_admin',
    'institution_staff',
    'medical_records_officer',
    'pharmacy',
    'wholesale_pharmacy',
    'pharmacist',
    'pharmacy_technologist',
    'lab',
    'lab_technician',
    'doctor',
    'specialist',
    'medical_licentiate',
    'clinical_officer',
    'dentist',
    'dental_therapist',
    'nurse',
    'registered_nurse',
    'enrolled_nurse',
    'midwife',
    'radiologist',
    'radiographer',
    'pathologist',
    'physiotherapist',
    'occupational_therapist',
    'nutritionist',
    'optometrist',
    'psychologist',
    'environmental_health_officer',
    'community_health_worker',
    'traditional_practitioner',
    'support',
    'super_admin',
    'cxo',
    'receptionist',
    'hr_manager',
    'ot_staff',
    'phlebotomist',
    'billing_staff',
    'inventory_manager',
    'triage_staff',
    'maintenance_manager',
    'ambulance_staff'
  ];
BEGIN
  FOREACH v IN ARRAY new_roles LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role' AND e.enumlabel = v
    ) THEN
      EXECUTE format('ALTER TYPE public.user_role ADD VALUE %L', v);
    END IF;
  END LOOP;
END $$;

-- ─── 3. provider_types — every HPCZ/NMCZ cadre ────────────────────────────
INSERT INTO public.provider_types (code, name, description, requires_license, requires_verification, display_order) VALUES
  ('doctor', 'Doctor (Medical Officer / GP)', 'HPCZ-registered medical doctor', true, true, 1),
  ('specialist', 'Specialist / Consultant', 'HPCZ specialist-register doctor', true, true, 2),
  ('medical_licentiate', 'Medical Licentiate Practitioner', 'HPCZ degree clinician (ML)', true, true, 3),
  ('clinical_officer', 'Clinical Officer', 'HPCZ clinical officer general', true, true, 4),
  ('dentist', 'Dentist (Dental Surgeon)', 'HPCZ dental surgeon', true, true, 5),
  ('dental_therapist', 'Dental Therapist / Hygienist', 'HPCZ dental therapy & hygiene', true, true, 6),
  ('nurse', 'Nurse (General)', 'NMCZ-registered nursing professional', true, true, 7),
  ('registered_nurse', 'Registered Nurse (RN)', 'NMCZ registered nurse / BScN', true, true, 8),
  ('enrolled_nurse', 'Enrolled Nurse (EN)', 'NMCZ enrolled nurse', true, true, 9),
  ('midwife', 'Midwife (RM/EM)', 'NMCZ registered/enrolled midwife', true, true, 10),
  ('pharmacist', 'Pharmacist', 'HPCZ pharmacist (BPharm)', true, true, 11),
  ('pharmacy_technologist', 'Pharmacy Technologist / Dispenser', 'HPCZ diploma & dispenser cadre', true, true, 12),
  ('radiologist', 'Radiologist', 'Medical imaging specialist doctor', true, true, 13),
  ('radiographer', 'Radiographer / Imaging Technologist', 'HPCZ radiography cadre', true, true, 14),
  ('pathologist', 'Pathologist', 'Laboratory medicine specialist', true, true, 15),
  ('lab_technician', 'Lab Technician / Technologist', 'HPCZ laboratory cadre', true, true, 16),
  ('physiotherapist', 'Physiotherapist', 'HPCZ physiotherapy cadre', true, true, 17),
  ('occupational_therapist', 'Occupational Therapist', 'HPCZ occupational therapy', true, true, 18),
  ('nutritionist', 'Nutritionist / Dietician', 'HPCZ nutrition & dietetics', true, true, 19),
  ('optometrist', 'Optometrist / Optician', 'HPCZ eye-care cadre', true, true, 20),
  ('psychologist', 'Clinical Psychologist', 'HPCZ clinical psychology', true, true, 21),
  ('environmental_health_officer', 'Environmental Health Officer', 'HPCZ EHO / technologist', true, true, 22),
  ('community_health_worker', 'Community Health Worker / Assistant', 'Community-based primary care', true, true, 23),
  ('traditional_practitioner', 'Traditional Health Practitioner', 'THPCZ-registered traditional medicine', true, true, 24),
  ('health_personnel', 'Other Health Professional', 'Any other licensed cadre', false, true, 25)
ON CONFLICT (code) DO NOTHING;

-- ─── 4. institution_types — MOH pyramid + private + ZAMRA ─────────────────
INSERT INTO public.institution_types (code, name, description, icon_name, color_class, display_order) VALUES
  -- Public pyramid (MOH Zambia)
  ('health_post', 'Health Post', 'Community-level primary care post', 'Plus', '#16a34a', 1),
  ('rural_health_centre', 'Rural Health Centre', 'Primary care for rural catchments', 'Cross', '#16a34a', 2),
  ('urban_health_centre', 'Urban Health Centre', 'Primary care for urban communities', 'Cross', '#16a34a', 3),
  ('mini_hospital', 'Mini Hospital / Zonal Facility', 'Small hospital, limited admissions', 'Building', '#0d9488', 4),
  ('district_hospital', 'District Hospital (First-Level)', 'First referral level', 'Building2', '#0284c7', 5),
  ('provincial_hospital', 'Provincial / General Hospital (Second-Level)', 'Second referral level', 'Building2', '#4f46e5', 6),
  ('tertiary_hospital', 'Tertiary / Teaching Hospital (Third-Level)', 'National referral & teaching', 'Landmark', '#7c3aed', 7),
  -- Specialised hospitals
  ('maternity_hospital', 'Maternity Hospital', 'Obstetric & newborn specialised care', 'Baby', '#ec4899', 10),
  ('children_hospital', 'Children''s Hospital', 'Specialised paediatric care', 'Smile', '#ec4899', 11),
  ('mental_hospital', 'Mental Health Hospital', 'Psychiatric specialised care', 'Brain', '#8b5cf6', 12),
  ('cancer_hospital', 'Cancer / Oncology Hospital', 'Oncology specialised care', 'Ribbon', '#e11d48', 13),
  ('cardiac_hospital', 'Cardiac / Heart Hospital', 'Cardiology & cardiothoracic care', 'HeartPulse', '#e11d48', 14),
  ('eye_hospital', 'Eye Hospital', 'Ophthalmology specialised care', 'Eye', '#0ea5e9', 15),
  ('orthopaedic_hospital', 'Orthopaedic Hospital', 'Bone & joint specialised care', 'Bone', '#64748b', 16),
  ('dialysis_centre', 'Dialysis / Renal Centre', 'Renal replacement therapy', 'Droplets', '#0891b2', 17),
  -- Private practice
  ('clinic', 'Clinic / Small Practice', 'Outpatient day practice', 'Stethoscope', '#00c875', 20),
  ('specialty_clinic', 'Specialty Clinic', 'Single-specialty outpatient clinic', 'Activity', '#fdab3d', 21),
  ('dental_clinic', 'Dental Clinic', 'Oral & dental care clinic', 'Smile', '#06b6d4', 22),
  ('eye_clinic', 'Eye Clinic', 'Optometry & eye care clinic', 'Eye', '#0ea5e9', 23),
  ('physiotherapy_centre', 'Physiotherapy & Rehab Centre', 'Rehabilitation services', 'Dumbbell', '#6366f1', 24),
  ('hospital', 'Private Hospital', 'Full private hospital services', 'Building2', '#e44258', 25),
  -- Pharmacy (ZAMRA premises)
  ('retail_pharmacy', 'Retail / Community Pharmacy', 'Dispense to the public (ZAMRA retail licence)', 'Pill', '#0073ea', 30),
  ('hospital_pharmacy', 'Hospital Pharmacy Department', 'In-house hospital dispensing unit', 'Pill', '#0073ea', 31),
  ('wholesale_pharmacy', 'Wholesale Pharmacy / Distributor', 'B2B distribution (ZAMRA wholesale licence)', 'Truck', '#7c3aed', 32),
  ('health_shop', 'Health Shop', 'OTC, supplements & wellness', 'ShoppingBag', '#84cc16', 33),
  ('pharmacy', 'Pharmacy', 'Pharmacy / drug store (legacy)', 'Pill', '#0073ea', 34),
  -- Diagnostics
  ('laboratory', 'Medical Laboratory', 'Sample testing & pathology', 'FlaskConical', '#6366f1', 40),
  ('imaging_centre', 'Imaging / Radiology Centre', 'X-ray, ultrasound, CT & MRI', 'Scan', '#f97316', 41),
  ('diagnostic_centre', 'Diagnostic Centre (Lab + Imaging)', 'Combined lab & imaging services', 'Microscope', '#a25ddc', 42),
  ('blood_bank', 'Blood Bank / Transfusion Service', 'Blood collection & transfusion', 'Droplet', '#dc2626', 43),
  -- Long-term & community care
  ('nursing_home', 'Nursing / Care Home', 'Long-term residential nursing care', 'Home', '#ec4899', 50),
  ('hospice', 'Hospice / Palliative Care', 'End-of-life & palliative care', 'HeartHandshake', '#f43f5e', 51),
  ('home_care', 'Home-Based Care Service', 'Domiciliary nursing & clinical visits', 'HousePlus', '#14b8a6', 52),
  ('rehabilitation_centre', 'Rehabilitation Centre', 'Long-stay physical & occupational rehab', 'Accessibility', '#6366f1', 53)
ON CONFLICT (code) DO NOTHING;

-- ─── 5. video_consultations — columns the create-daily-room edge ──────────
-- function already writes (network_optimized / tv_mode / recording_enabled).
-- Without these, every teledoctor room creation fails.
ALTER TABLE public.video_consultations
  ADD COLUMN IF NOT EXISTS network_optimized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tv_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean NOT NULL DEFAULT false;

-- ─── 6. Public read on reference tables (signup works before login) ───────
ALTER TABLE public.provider_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read provider_types" ON public.provider_types;
CREATE POLICY "Public read provider_types"
  ON public.provider_types FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public read institution_types" ON public.institution_types;
CREATE POLICY "Public read institution_types"
  ON public.institution_types FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Public read countries" ON public.countries;
CREATE POLICY "Public read countries"
  ON public.countries FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
