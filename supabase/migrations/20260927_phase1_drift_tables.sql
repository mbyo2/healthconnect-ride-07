-- ============================================================================
-- Phase 1 DB hardening — drift tables (2026-09-27)
--
-- Production contained tables/columns that NO repo migration creates
-- (created via the dashboard or unrecorded migrations). This file documents
-- them idempotently so the repo matches prod going forward.
--
-- Verified against the LIVE production schema 2026-09-27 (read-only
-- inspection): column names, types, nullability, defaults, and primary keys
-- were copied from information_schema. Row counts at inspection time:
-- insurance_information 0 rows, institution_staff 18 rows, symptoms_diary 0.
--
-- Every statement is IF NOT EXISTS-safe: applying this to production is a
-- no-op. RLS policies, triggers, and foreign keys on these tables are left
-- exactly as they are in prod (not reverse-engineered here) — this file
-- covers structure only.
-- ============================================================================

-- Insurance cards linked to patients (referenced by app code; created in prod
-- outside migrations).
CREATE TABLE IF NOT EXISTS public.insurance_information (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  provider_name text NOT NULL,
  policy_number text NOT NULL,
  group_number text,
  coverage_start_date date NOT NULL,
  coverage_end_date date,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Staff roster per institution (HR surface reads this; created in prod
-- outside migrations).
CREATE TABLE IF NOT EXISTS public.institution_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id uuid,
  provider_id uuid,
  role text NOT NULL,
  department text,
  start_date date,
  end_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  employee_id text,
  phone text,
  email text,
  qualification text
);

-- Patient symptom diary (only used by the legacy PatientDashboard; kept for
-- schema parity).
CREATE TABLE IF NOT EXISTS public.symptoms_diary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL,
  symptoms text NOT NULL,
  severity text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Soft-delete / active flag on hospital departments (present in prod,
-- no repo migration created it).
ALTER TABLE public.hospital_departments
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ============================================================================
-- VERIFICATION (record in the launch log)
--   SELECT table_name FROM information_schema.tables
--     WHERE table_schema='public'
--     AND table_name IN ('insurance_information','institution_staff','symptoms_diary');
--     -> 3 rows (were already present in prod; this migration is a no-op there)
--   SELECT column_name FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='hospital_departments'
--     AND column_name='is_active';  -> 1 row
-- ============================================================================
