-- ============================================================
-- Doc'O Clock — Phase 0: patient-role drift catch-up + RLS repairs
--
-- Fixes (from Phase 0 patient audit, 2026-09-29; drift verified live):
--  A3 (LAUNCH-BLOCKING): symptoms_diary exists in prod but the patient
--      INSERT is RLS-denied (403 verified live) — symptom logging is broken.
--  A6 (LAUNCH-BLOCKING): the `avatars` storage bucket does NOT exist in
--      prod (404 verified live) — profile photo upload fails for everyone.
--  A2: notifications — table exists in prod with working owner CRUD
--      (verified live); repo had schema + policies missing. Documented here.
--  A4: insurance_information — exists in prod, owner CRUD works (verified
--      live). Documented here.
--  A5: emergency_contacts — exists in prod, owner CRUD works (verified
--      live). Documented here.
--  B8: ai_diagnosis_history — exists in prod (types.ts); documented with
--      strict owner RLS (the UI reads without a user filter).
--  B9: healthcare_services, provider_locations, provider_availability —
--      exist in prod; documented (no RLS changes beyond owner-safe reads).
--  B3: medication_administration_records — add patient SELECT (own rows);
--      PatientMAR was always empty.
--  B6: orders — add tightly scoped owner DELETE for pending orders so the
--      marketplace rollback can actually clean up orphans.
--  B10: medications — add extended lifecycle/reminder columns the UI
--      already degrades around (is_active, instructions, dates, reminders).
--
-- All DDL is IF NOT EXISTS / OR REPLACE / DROP-IF-EXISTS first: safe on
-- prod where the objects already exist. Apply via Supabase SQL editor.
-- ============================================================

-- ─── A3: symptoms_diary owner RLS (table already exists in prod) ───
CREATE TABLE IF NOT EXISTS public.symptoms_diary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptoms TEXT NOT NULL,
  severity TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symptoms_diary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own symptoms diary" ON public.symptoms_diary;
CREATE POLICY "Patients manage own symptoms diary"
  ON public.symptoms_diary FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ─── A6: avatars bucket + policies ───
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users manage own avatars" ON storage.objects;
CREATE POLICY "Users manage own avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ─── A2: notifications (document prod schema + owner RLS) ───
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── A4: insurance_information (document prod schema + owner RLS) ───
CREATE TABLE IF NOT EXISTS public.insurance_information (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  group_number TEXT,
  coverage_start_date DATE NOT NULL,
  coverage_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.insurance_information ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own insurance information" ON public.insurance_information;
CREATE POLICY "Patients manage own insurance information"
  ON public.insurance_information FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ─── A5: emergency_contacts (document prod schema + owner RLS) ───
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  email TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Patients manage own emergency contacts"
  ON public.emergency_contacts FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- ─── B8: ai_diagnosis_history (document + strict owner RLS) ───
CREATE TABLE IF NOT EXISTS public.ai_diagnosis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms TEXT NOT NULL,
  analysis TEXT,
  patient_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_diagnosis_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own AI diagnosis history" ON public.ai_diagnosis_history;
CREATE POLICY "Users read own AI diagnosis history"
  ON public.ai_diagnosis_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own AI diagnosis history" ON public.ai_diagnosis_history;
CREATE POLICY "Users insert own AI diagnosis history"
  ON public.ai_diagnosis_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── B3: PatientMAR — patient reads own medication administration records ───
DROP POLICY IF EXISTS "Patients view own MAR" ON public.medication_administration_records;
CREATE POLICY "Patients view own MAR"
  ON public.medication_administration_records FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

-- ─── B6: orders — scoped owner DELETE for pending orders (rollback path) ───
DROP POLICY IF EXISTS "Patients delete own pending orders" ON public.orders;
CREATE POLICY "Patients delete own pending orders"
  ON public.orders FOR DELETE TO authenticated
  USING (patient_id = auth.uid() AND status = 'pending');

-- ─── B10: medications extended lifecycle/reminder columns ───
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS refill_date DATE;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS reminder_times TEXT[] DEFAULT '{}';

-- ─── B9: drift documentation (tables exist in prod; no behavior change) ───
CREATE TABLE IF NOT EXISTS public.healthcare_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.healthcare_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read healthcare services" ON public.healthcare_services;
CREATE POLICY "Authenticated read healthcare services"
  ON public.healthcare_services FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.provider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read provider locations" ON public.provider_locations;
CREATE POLICY "Authenticated read provider locations"
  ON public.provider_locations FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read provider availability" ON public.provider_availability;
CREATE POLICY "Authenticated read provider availability"
  ON public.provider_availability FOR SELECT TO authenticated USING (true);
