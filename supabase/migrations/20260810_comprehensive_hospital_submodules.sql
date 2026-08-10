-- ============================================================
-- Migration: Complete Hospital Sub-Modules & Infrastructure Schema
-- Date: 2026-08-10
-- Purpose:
--   Guarantees database completeness for Radiology, Blood Bank, 
--   Diet & Nutrition, CSSD Sterilization, Day Care Procedures, 
--   Provider Schedules, GDPR Data Privacy, and Medication Tracking.
--   Fully idempotent & 100% resilient against pre-existing tables.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- 1. RADIOLOGY & IMAGING REQUESTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.radiology_requests (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID,
  patient_id      UUID,
  provider_id     UUID,
  radiologist_id  UUID,
  modality        TEXT         DEFAULT 'X-Ray',
  study_name      TEXT         DEFAULT 'Routine Study',
  body_part       TEXT,
  priority        TEXT         DEFAULT 'routine',
  status          TEXT         DEFAULT 'requested',
  clinical_notes  TEXT,
  findings        TEXT,
  impression      TEXT,
  image_urls      TEXT[]       DEFAULT '{}'::text[],
  report_url      TEXT,
  performed_at    TIMESTAMP WITH TIME ZONE,
  reported_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.radiology_requests ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.radiology_requests ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.radiology_requests ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'X-Ray';
ALTER TABLE public.radiology_requests ADD COLUMN IF NOT EXISTS study_name TEXT DEFAULT 'Routine Study';
ALTER TABLE public.radiology_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'requested';

ALTER TABLE public.radiology_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view radiology requests" ON public.radiology_requests;
CREATE POLICY "Authenticated users can view radiology requests" ON public.radiology_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage radiology requests" ON public.radiology_requests;
CREATE POLICY "Authenticated users can manage radiology requests" ON public.radiology_requests FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_radiology_requests_hospital ON public.radiology_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_patient ON public.radiology_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_status ON public.radiology_requests(status);


-- -----------------------------------------------------------
-- 2. BLOOD BANK INVENTORY & REQUESTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blood_bank_inventory (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID,
  blood_group     TEXT         DEFAULT 'O+',
  component_type  TEXT         DEFAULT 'Whole Blood',
  units_available INTEGER      DEFAULT 0,
  donor_id        TEXT,
  collection_date DATE,
  expiry_date     DATE         DEFAULT CURRENT_DATE + INTERVAL '35 days',
  location_rack   TEXT,
  status          TEXT         DEFAULT 'available',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.blood_bank_inventory ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.blood_bank_inventory ADD COLUMN IF NOT EXISTS blood_group TEXT DEFAULT 'O+';
ALTER TABLE public.blood_bank_inventory ADD COLUMN IF NOT EXISTS component_type TEXT DEFAULT 'Whole Blood';
ALTER TABLE public.blood_bank_inventory ADD COLUMN IF NOT EXISTS units_available INTEGER DEFAULT 0;

ALTER TABLE public.blood_bank_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access blood bank inventory" ON public.blood_bank_inventory;
CREATE POLICY "Authenticated users access blood bank inventory" ON public.blood_bank_inventory FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_blood_bank_hospital ON public.blood_bank_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_bank_group ON public.blood_bank_inventory(blood_group);


CREATE TABLE IF NOT EXISTS public.blood_bank_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID,
  patient_id       UUID,
  requested_by     UUID,
  blood_group      TEXT        DEFAULT 'O+',
  component_type   TEXT        DEFAULT 'Whole Blood',
  units_requested  INTEGER     DEFAULT 1,
  urgency          TEXT        DEFAULT 'routine',
  status           TEXT        DEFAULT 'pending',
  crossmatch_status TEXT       DEFAULT 'pending',
  required_by_date TIMESTAMP WITH TIME ZONE,
  notes            TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.blood_bank_requests ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.blood_bank_requests ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.blood_bank_requests ADD COLUMN IF NOT EXISTS blood_group TEXT DEFAULT 'O+';
ALTER TABLE public.blood_bank_requests ADD COLUMN IF NOT EXISTS component_type TEXT DEFAULT 'Whole Blood';

ALTER TABLE public.blood_bank_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access blood bank requests" ON public.blood_bank_requests;
CREATE POLICY "Authenticated users access blood bank requests" ON public.blood_bank_requests FOR ALL TO authenticated USING (true);


-- -----------------------------------------------------------
-- 3. DIET & NUTRITION MANAGEMENT
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID,
  patient_id       UUID,
  prescribed_by    UUID,
  diet_type        TEXT        DEFAULT 'Regular',
  calories_per_day INTEGER,
  meal_frequency   INTEGER     DEFAULT 3,
  restrictions     TEXT,
  allergies        TEXT,
  start_date       DATE        DEFAULT CURRENT_DATE,
  end_date         DATE,
  status           TEXT        DEFAULT 'active',
  instructions     TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS diet_type TEXT DEFAULT 'Regular';

ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access diet plans" ON public.diet_plans;
CREATE POLICY "Authenticated users access diet plans" ON public.diet_plans FOR ALL TO authenticated USING (true);


-- -----------------------------------------------------------
-- 4. CSSD (STERILIZATION & DISINFECTION)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cssd_items (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          UUID,
  item_name            TEXT    DEFAULT 'Surgical Instrument',
  category             TEXT    DEFAULT 'Surgical Trays',
  batch_number         TEXT,
  sterilization_method TEXT    DEFAULT 'Autoclave',
  sterilized_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expiry_date          DATE,
  status               TEXT    DEFAULT 'sterilized',
  technician_id        UUID,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.cssd_items ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.cssd_items ADD COLUMN IF NOT EXISTS item_name TEXT DEFAULT 'Surgical Instrument';

ALTER TABLE public.cssd_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access cssd items" ON public.cssd_items;
CREATE POLICY "Authenticated users access cssd items" ON public.cssd_items FOR ALL TO authenticated USING (true);


-- -----------------------------------------------------------
-- 5. DAY CARE PROCEDURES
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.day_care_procedures (
  id                UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID,
  patient_id        UUID,
  provider_id       UUID,
  procedure_name    TEXT       DEFAULT 'Day Care Procedure',
  scheduled_date    DATE       DEFAULT CURRENT_DATE,
  scheduled_time    TEXT,
  duration_hours    NUMERIC    DEFAULT 4,
  status            TEXT       DEFAULT 'scheduled',
  discharge_summary TEXT,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.day_care_procedures ADD COLUMN IF NOT EXISTS hospital_id UUID;
ALTER TABLE public.day_care_procedures ADD COLUMN IF NOT EXISTS patient_id UUID;
ALTER TABLE public.day_care_procedures ADD COLUMN IF NOT EXISTS procedure_name TEXT DEFAULT 'Day Care Procedure';

ALTER TABLE public.day_care_procedures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access day care procedures" ON public.day_care_procedures;
CREATE POLICY "Authenticated users access day care procedures" ON public.day_care_procedures FOR ALL TO authenticated USING (true);


-- -----------------------------------------------------------
-- 6. PROVIDER TIME SLOTS (CALENDAR & APPOINTMENTS)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_time_slots (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID,
  institution_id UUID,
  slot_date      DATE          DEFAULT CURRENT_DATE,
  start_time     TIME          DEFAULT '08:00:00',
  end_time       TIME          DEFAULT '08:30:00',
  is_booked      BOOLEAN       DEFAULT false,
  slot_type      TEXT          DEFAULT 'opd',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ensure all columns exist explicitly for existing tables
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS provider_id UUID;
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS institution_id UUID;
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS slot_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '08:00:00';
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '08:30:00';
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS is_booked BOOLEAN DEFAULT false;
ALTER TABLE public.provider_time_slots ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'opd';

ALTER TABLE public.provider_time_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access provider time slots" ON public.provider_time_slots;
CREATE POLICY "Authenticated users access provider time slots" ON public.provider_time_slots FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_provider_time_slots_provider ON public.provider_time_slots(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_time_slots_date ON public.provider_time_slots(slot_date);


-- -----------------------------------------------------------
-- 7. PERSONAL MEDICATIONS (PATIENT MEDICATION TRACKER)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medications (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  name         TEXT            DEFAULT 'Medication',
  dosage       TEXT,
  frequency    TEXT,
  instructions TEXT,
  is_active    BOOLEAN         DEFAULT true,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Medication';

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own medications" ON public.medications;
CREATE POLICY "Users can view their own medications" ON public.medications FOR ALL TO authenticated USING (auth.uid() = user_id);


-- -----------------------------------------------------------
-- 8. GDPR & DATA PRIVACY SUBJECT REQUESTS
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id           UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  request_type TEXT            DEFAULT 'export',
  status       TEXT            DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  admin_notes  TEXT
);

ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'export';

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their data subject requests" ON public.data_subject_requests;
CREATE POLICY "Users can access their data subject requests" ON public.data_subject_requests FOR ALL TO authenticated USING (auth.uid() = user_id);
