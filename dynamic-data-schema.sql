-- ============================================================================
-- DYNAMIC DATA TABLES - Replace Hardcoded Values
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. COUNTRIES & REGIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- ISO 3166-1 alpha-2 (e.g., ZM, US, GB)
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  currency_symbol text NOT NULL DEFAULT '$',
  phone_prefix text NOT NULL,
  date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format text NOT NULL DEFAULT 'HH24:MI',
  calling_code integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}',
  date_time_format text DEFAULT 'mixed',
  timezone text,
  locale text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  dial_code text NOT NULL, -- e.g., +260, +1, +44
  flag_emoji text,
  CONSTRAINT countries_pkey PRIMARY KEY (id)
);

-- Add missing columns if table exists without them
DO $$
BEGIN
  -- Check and add currency if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN currency text NOT NULL DEFAULT 'USD';
  END IF;

  -- Check and add currency_symbol if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'currency_symbol'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN currency_symbol text NOT NULL DEFAULT '$';
  END IF;

  -- Check and add phone_prefix if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'phone_prefix'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN phone_prefix text NOT NULL DEFAULT '';
  END IF;

  -- Check and add date_format if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'date_format'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN date_format text NOT NULL DEFAULT 'YYYY-MM-DD';
  END IF;

  -- Check and add time_format if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'time_format'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN time_format text NOT NULL DEFAULT 'HH24:MI';
  END IF;

  -- Check and add calling_code if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'calling_code'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN calling_code integer NOT NULL DEFAULT 0;
  END IF;

  -- Check and add settings if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN settings jsonb DEFAULT '{}';
  END IF;

  -- Check and add date_time_format if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'date_time_format'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN date_time_format text DEFAULT 'mixed';
  END IF;

  -- Check and add timezone if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN timezone text;
  END IF;

  -- Check and add locale if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'locale'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN locale text;
  END IF;

  -- Check and add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Check and add dial_code if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'dial_code'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN dial_code text;
  END IF;

  -- Check and add flag_emoji if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'countries' AND column_name = 'flag_emoji'
  ) THEN
    ALTER TABLE public.countries ADD COLUMN flag_emoji text;
  END IF;

  -- Update values for columns that might have been added
  UPDATE public.countries SET dial_code = '+260' WHERE code = 'ZM' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+27' WHERE code = 'ZA' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+254' WHERE code = 'KE' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+234' WHERE code = 'NG' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+44' WHERE code = 'GB' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+1' WHERE code = 'US' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+1' WHERE code = 'CA' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+61' WHERE code = 'AU' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+49' WHERE code = 'DE' AND dial_code IS NULL;
  UPDATE public.countries SET dial_code = '+33' WHERE code = 'FR' AND dial_code IS NULL;

  UPDATE public.countries SET flag_emoji = '🇿🇲' WHERE code = 'ZM' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇿🇦' WHERE code = 'ZA' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇰🇪' WHERE code = 'KE' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇳🇬' WHERE code = 'NG' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇬🇧' WHERE code = 'GB' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇺🇸' WHERE code = 'US' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇨🇦' WHERE code = 'CA' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇦🇺' WHERE code = 'AU' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇩🇪' WHERE code = 'DE' AND flag_emoji IS NULL;
  UPDATE public.countries SET flag_emoji = '🇫🇷' WHERE code = 'FR' AND flag_emoji IS NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.regions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id),
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT regions_pkey PRIMARY KEY (id),
  CONSTRAINT regions_country_code UNIQUE (country_id, code)
);

-- ============================================================================
-- 2. MEDICAL SPECIALTIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medical_specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL, -- clinical, diagnostic, pharmacy, lab, etc.
  description text,
  icon_name text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT medical_specialties_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 3. PROVIDER TYPES & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.provider_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  requires_license boolean NOT NULL DEFAULT true,
  requires_verification boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT provider_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 4. INSTITUTION TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_name text,
  color_class text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT institution_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 5. INSURANCE PROVIDERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insurance_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  country_id uuid REFERENCES public.countries(id),
  contact_email text,
  contact_phone text,
  website text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT insurance_providers_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 6. GENDER OPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gender_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT gender_options_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 7. BLOOD TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.blood_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT blood_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 8. RELATIONSHIP TYPES (for emergency contacts, family members)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.relationship_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT relationship_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 9. ALLERGY SEVERITY LEVELS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.allergy_severity (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  color_class text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT allergy_severity_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 10. MEDICATION FREQUENCY OPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medication_frequency (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  times_per_day integer,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT medication_frequency_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 11. APPOINTMENT TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointment_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 30,
  is_virtual boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT appointment_types_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 12. NOTIFICATION TEMPLATES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text,
  body text,
  type text NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
  language text DEFAULT 'en',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT notification_templates_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 13. UI CONFIGURATION (labels, messages, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ui_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  category text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ui_config_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gender_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allergy_severity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_frequency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_config ENABLE ROW LEVEL SECURITY;

-- Public read access for reference data
CREATE POLICY "Anyone can view countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Anyone can view regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Anyone can view medical specialties" ON public.medical_specialties FOR SELECT USING (true);
CREATE POLICY "Anyone can view provider types" ON public.provider_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view institution types" ON public.institution_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view insurance providers" ON public.insurance_providers FOR SELECT USING (true);
CREATE POLICY "Anyone can view gender options" ON public.gender_options FOR SELECT USING (true);
CREATE POLICY "Anyone can view blood types" ON public.blood_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view relationship types" ON public.relationship_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view allergy severity" ON public.allergy_severity FOR SELECT USING (true);
CREATE POLICY "Anyone can view medication frequency" ON public.medication_frequency FOR SELECT USING (true);
CREATE POLICY "Anyone can view appointment types" ON public.appointment_types FOR SELECT USING (true);
CREATE POLICY "Anyone can view notification templates" ON public.notification_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can view ui config" ON public.ui_config FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admin can manage countries" ON public.countries FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage regions" ON public.regions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage medical specialties" ON public.medical_specialties FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage provider types" ON public.provider_types FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage institution types" ON public.institution_types FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage insurance providers" ON public.insurance_providers FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage gender options" ON public.gender_options FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage blood types" ON public.blood_types FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage relationship types" ON public.relationship_types FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage allergy severity" ON public.allergy_severity FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage medication frequency" ON public.medication_frequency FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage appointment types" ON public.appointment_types FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage notification templates" ON public.notification_templates FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Admin can manage ui config" ON public.ui_config FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_regions_country ON public.regions(country_id);
CREATE INDEX IF NOT EXISTS idx_specialties_code ON public.medical_specialties(code);
CREATE INDEX IF NOT EXISTS idx_specialties_category ON public.medical_specialties(category);
CREATE INDEX IF NOT EXISTS idx_provider_types_code ON public.provider_types(code);
CREATE INDEX IF NOT EXISTS idx_institution_types_code ON public.institution_types(code);
CREATE INDEX IF NOT EXISTS idx_insurance_providers_country ON public.insurance_providers(country_id);
CREATE INDEX IF NOT EXISTS idx_ui_config_key ON public.ui_config(key);
CREATE INDEX IF NOT EXISTS idx_ui_config_category ON public.ui_config(category);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Countries ( Zambia-focused + major countries)
-- Insert with all required columns matching actual database schema
INSERT INTO public.countries (code, name, currency, currency_symbol, phone_prefix, date_format, time_format, calling_code, is_active, settings, date_time_format, dial_code, flag_emoji) VALUES
  ('ZM', 'Zambia', 'USD', '$', '260', 'YYYY-MM-DD', 'HH24:MI', 260, true, '{}', 'mixed', '+260', '🇿🇲'),
  ('ZA', 'South Africa', 'ZAR', 'R', '27', 'YYYY-MM-DD', 'HH24:MI', 27, true, '{}', 'mixed', '+27', '🇿🇦'),
  ('KE', 'Kenya', 'KES', 'KSh', '254', 'YYYY-MM-DD', 'HH24:MI', 254, true, '{}', 'mixed', '+254', '🇰🇪'),
  ('NG', 'Nigeria', 'NGN', '₦', '234', 'YYYY-MM-DD', 'HH24:MI', 234, true, '{}', 'mixed', '+234', '🇳🇬'),
  ('GB', 'United Kingdom', 'GBP', '£', '44', 'DD/MM/YYYY', 'HH24:MI', 44, true, '{}', 'mixed', '+44', '🇬🇧'),
  ('US', 'United States', 'USD', '$', '1', 'MM/DD/YYYY', 'HH12:MI AM', 1, true, '{}', 'mixed', '+1', '🇺🇸'),
  ('CA', 'Canada', 'CAD', '$', '1', 'YYYY-MM-DD', 'HH24:MI', 1, true, '{}', 'mixed', '+1', '🇨🇦'),
  ('AU', 'Australia', 'AUD', '$', '61', 'DD/MM/YYYY', 'HH24:MI', 61, true, '{}', 'mixed', '+61', '🇦🇺'),
  ('DE', 'Germany', 'EUR', '€', '49', 'DD.MM.YYYY', 'HH24:MI', 49, true, '{}', 'mixed', '+49', '🇩🇪'),
  ('FR', 'France', 'EUR', '€', '33', 'DD/MM/YYYY', 'HH24:MI', 33, true, '{}', 'mixed', '+33', '🇫🇷')
ON CONFLICT (code) DO UPDATE SET
  currency = EXCLUDED.currency,
  currency_symbol = EXCLUDED.currency_symbol,
  phone_prefix = EXCLUDED.phone_prefix,
  date_format = EXCLUDED.date_format,
  time_format = EXCLUDED.time_format,
  calling_code = EXCLUDED.calling_code,
  dial_code = EXCLUDED.dial_code,
  flag_emoji = EXCLUDED.flag_emoji;

-- Zambia Provinces
INSERT INTO public.regions (country_id, code, name) VALUES
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'CB', 'Copperbelt'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'LU', 'Lusaka'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'SP', 'Southern Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'NP', 'Northern Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'WP', 'Western Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'EP', 'Eastern Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'CP', 'Central Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'NW', 'North-Western Province'),
  ((SELECT id FROM public.countries WHERE code = 'ZM'), 'MP', 'Muchinga Province')
ON CONFLICT (country_id, code) DO NOTHING;

-- Medical Specialties
INSERT INTO public.medical_specialties (code, name, category, description, display_order) VALUES
  ('GP', 'General Practice', 'clinical', 'Primary care physicians', 1),
  ('INT', 'Internal Medicine', 'clinical', 'Adult medicine specialists', 2),
  ('PED', 'Pediatrics', 'clinical', 'Child health specialists', 3),
  ('OBS', 'Obstetrics & Gynecology', 'clinical', 'Women''s health', 4),
  ('SUR', 'General Surgery', 'clinical', 'Surgical procedures', 5),
  ('ORT', 'Orthopedics', 'clinical', 'Bone and joint specialists', 6),
  ('CAR', 'Cardiology', 'clinical', 'Heart specialists', 7),
  ('DER', 'Dermatology', 'clinical', 'Skin specialists', 8),
  ('NEU', 'Neurology', 'clinical', 'Brain and nervous system', 9),
  ('PSY', 'Psychiatry', 'clinical', 'Mental health', 10),
  ('OPTH', 'Ophthalmology', 'clinical', 'Eye specialists', 11),
  ('ENT', 'ENT (Otolaryngology)', 'clinical', 'Ear, nose, throat', 12),
  ('RAD', 'Radiology', 'diagnostic', 'Medical imaging', 13),
  ('PATH', 'Pathology', 'diagnostic', 'Laboratory medicine', 14),
  ('PHARM', 'Pharmacy', 'pharmacy', 'Medication specialists', 15),
  ('NUR', 'Nursing', 'clinical', 'Patient care', 16),
  ('LAB', 'Laboratory Technician', 'lab', 'Lab testing', 17),
  ('DENT', 'Dentistry', 'clinical', 'Dental care', 18),
  ('PHY', 'Physiotherapy', 'clinical', 'Physical rehabilitation', 19),
  ('EMER', 'Emergency Medicine', 'clinical', 'Emergency care', 20)
ON CONFLICT (code) DO NOTHING;

-- Provider Types
INSERT INTO public.provider_types (code, name, description, requires_license, display_order) VALUES
  ('doctor', 'Doctor', 'Medical doctor', true, 1),
  ('nurse', 'Nurse', 'Registered nurse', true, 2),
  ('pharmacist', 'Pharmacist', 'Licensed pharmacist', true, 3),
  ('lab_technician', 'Lab Technician', 'Laboratory technician', true, 4),
  ('radiologist', 'Radiologist', 'Medical imaging specialist', true, 5),
  ('health_personnel', 'Health Professional', 'Other healthcare worker', false, 6)
ON CONFLICT (code) DO NOTHING;

-- Institution Types
INSERT INTO public.institution_types (code, name, description, icon_name, color_class, display_order) VALUES
  ('pharmacy', 'Pharmacy', 'Pharmacy and drug store', 'Pill', '#0073ea', 1),
  ('clinic', 'Clinic / Small Practice', 'Small medical practice', 'Stethoscope', '#00c875', 2),
  ('specialized_clinic', 'Specialized Clinic', 'Specialty clinic', 'Activity', '#fdab3d', 3),
  ('hospital', 'Hospital', 'General hospital', 'Hospital', '#e44258', 4),
  ('large_hospital', 'Large / Teaching Hospital', 'Major hospital network', 'Building2', '#a25ddc', 5),
  ('laboratory', 'Laboratory', 'Medical laboratory', 'Flask', '#6366f1', 6),
  ('nursing_home', 'Nursing / Care Home', 'Long-term care facility', 'Home', '#ec4899', 7),
  ('diagnostic_center', 'Diagnostic / Imaging Center', 'Imaging and diagnostics', 'Scan', '#f97316', 8)
ON CONFLICT (code) DO NOTHING;

-- Gender Options
INSERT INTO public.gender_options (code, name, description, display_order) VALUES
  ('male', 'Male', 'Male', 1),
  ('female', 'Female', 'Female', 2),
  ('other', 'Other', 'Other gender identity', 3),
  ('prefer_not_to_say', 'Prefer not to say', 'Decline to specify', 4)
ON CONFLICT (code) DO NOTHING;

-- Blood Types
INSERT INTO public.blood_types (code, name, display_order) VALUES
  ('A+', 'A Positive', 1),
  ('A-', 'A Negative', 2),
  ('B+', 'B Positive', 3),
  ('B-', 'B Negative', 4),
  ('AB+', 'AB Positive', 5),
  ('AB-', 'AB Negative', 6),
  ('O+', 'O Positive', 7),
  ('O-', 'O Negative', 8)
ON CONFLICT (code) DO NOTHING;

-- Relationship Types
INSERT INTO public.relationship_types (code, name, description, display_order) VALUES
  ('spouse', 'Spouse', 'Husband or wife', 1),
  ('partner', 'Partner', 'Domestic partner', 2),
  ('parent', 'Parent', 'Mother or father', 3),
  ('child', 'Child', 'Son or daughter', 4),
  ('sibling', 'Sibling', 'Brother or sister', 5),
  ('friend', 'Friend', 'Close friend', 6),
  ('other', 'Other', 'Other relationship', 7)
ON CONFLICT (code) DO NOTHING;

-- Allergy Severity
INSERT INTO public.allergy_severity (code, name, description, color_class, display_order) VALUES
  ('mild', 'Mild', 'Minor reaction', 'bg-green-100 text-green-800', 1),
  ('moderate', 'Moderate', 'Moderate reaction', 'bg-yellow-100 text-yellow-800', 2),
  ('severe', 'Severe', 'Serious reaction', 'bg-orange-100 text-orange-800', 3),
  ('life_threatening', 'Life-Threatening', 'Anaphylaxis risk', 'bg-red-100 text-red-800', 4)
ON CONFLICT (code) DO NOTHING;

-- Medication Frequency
INSERT INTO public.medication_frequency (code, name, description, times_per_day, display_order) VALUES
  ('once_daily', 'Once daily', 'Take once per day', 1, 1),
  ('twice_daily', 'Twice daily', 'Take twice per day', 2, 2),
  ('three_times_daily', 'Three times daily', 'Take three times per day', 3, 3),
  ('four_times_daily', 'Four times daily', 'Take four times per day', 4, 4),
  ('as_needed', 'As needed', 'Take when needed', 0, 5),
  ('weekly', 'Weekly', 'Take once per week', 0, 6),
  ('monthly', 'Monthly', 'Take once per month', 0, 7)
ON CONFLICT (code) DO NOTHING;

-- Appointment Types
INSERT INTO public.appointment_types (code, name, description, duration_minutes, is_virtual, display_order) VALUES
  ('consultation', 'General Consultation', 'Regular check-up or consultation', 30, false, 1),
  ('follow_up', 'Follow-up Visit', 'Follow-up from previous visit', 15, false, 2),
  ('video_consult', 'Video Consultation', 'Remote video consultation', 30, true, 3),
  ('emergency', 'Emergency Visit', 'Urgent medical issue', 15, false, 4),
  ('lab_test', 'Lab Test', 'Laboratory test appointment', 30, false, 5),
  ('procedure', 'Medical Procedure', 'Minor medical procedure', 60, false, 6),
  ('specialist', 'Specialist Consultation', 'Consultation with specialist', 45, false, 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Dynamic data tables created successfully!';
  RAISE NOTICE 'Tables created: 13';
  RAISE NOTICE 'RLS policies applied: 26';
  RAISE NOTICE 'Indexes created: 14';
  RAISE NOTICE 'Initial data loaded: Countries, Regions, Specialties, Provider Types, Institution Types, Genders, Blood Types, Relationships, Allergy Severity, Medication Frequency, Appointment Types';
END $$;
