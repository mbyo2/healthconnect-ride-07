-- Rider/Driver screening system — Yango-level and beyond
-- Date: 2026-10-10
-- Beyond Yango: medical fitness, medicine-handling training, multi-level approval

-- Screening checklist per courier
CREATE TABLE IF NOT EXISTS public.courier_screenings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Identity documents (Yango-level)
  nrc_document_url TEXT,                    -- National Registration Card
  nrc_verified BOOLEAN NOT NULL DEFAULT false,
  nrc_verified_at TIMESTAMPTZ,
  nrc_verified_by UUID REFERENCES auth.users(id),

  drivers_license_url TEXT,
  drivers_license_number TEXT,
  drivers_license_expiry DATE,
  drivers_license_verified BOOLEAN NOT NULL DEFAULT false,
  drivers_license_verified_at TIMESTAMPTZ,

  -- Vehicle documents (Yango-level)
  vehicle_registration_url TEXT,
  vehicle_insurance_url TEXT,
  vehicle_insurance_expiry DATE,
  vehicle_inspection_passed BOOLEAN NOT NULL DEFAULT false,
  vehicle_inspection_date DATE,
  vehicle_inspection_notes TEXT,

  -- Background check (Yango-level)
  background_check_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (background_check_status IN ('pending', 'in_progress', 'passed', 'failed')),
  background_check_date DATE,
  background_check_notes TEXT,

  -- BEYOND YANGO: medical fitness (handles medicines)
  medical_fitness_url TEXT,                 -- Medical fitness certificate
  medical_fitness_expiry DATE,
  medical_fitness_verified BOOLEAN NOT NULL DEFAULT false,

  -- BEYOND YANGO: medicine-handling training
  training_completed BOOLEAN NOT NULL DEFAULT false,
  training_completed_at TIMESTAMPTZ,
  training_score INTEGER CHECK (training_score >= 0 AND training_score <= 100),

  -- BEYOND YANGO: multi-level approval
  pharmacy_approved BOOLEAN NOT NULL DEFAULT false,
  pharmacy_approved_at TIMESTAMPTZ,
  pharmacy_approved_by UUID REFERENCES auth.users(id),
  platform_approved BOOLEAN NOT NULL DEFAULT false,
  platform_approved_at TIMESTAMPTZ,
  platform_approved_by UUID REFERENCES auth.users(id),

  -- Overall status (computed by app, stored for querying)
  screening_status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (screening_status IN ('incomplete', 'under_review', 'approved', 'rejected', 'suspended')),

  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW())
);

-- Screening documents (multiple files per screening)
CREATE TABLE IF NOT EXISTS public.courier_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_id UUID REFERENCES public.courier_screenings(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'nrc', 'drivers_license', 'vehicle_registration', 'vehicle_insurance',
    'medical_fitness', 'training_certificate', 'profile_photo', 'other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW())
);

-- Incident reports (beyond Yango: ongoing safety monitoring)
CREATE TABLE IF NOT EXISTS public.courier_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'late_delivery', 'damaged_package', 'rude_behavior', 'safety_concern',
    'lost_package', 'wrong_address', 'other'
  )),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_screenings_courier ON public.courier_screenings(courier_id);
CREATE INDEX IF NOT EXISTS idx_screenings_status ON public.courier_screenings(screening_status);
CREATE INDEX IF NOT EXISTS idx_documents_screening ON public.courier_documents(screening_id);
CREATE INDEX IF NOT EXISTS idx_incidents_courier ON public.courier_incidents(courier_id);

-- RLS
ALTER TABLE public.courier_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_incidents ENABLE ROW LEVEL SECURITY;

-- Couriers can read their own screening
CREATE POLICY "Couriers read own screening" ON public.courier_screenings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.couriers c WHERE c.id = courier_id AND c.user_id = auth.uid())
  );

-- Couriers can upload their own documents
CREATE POLICY "Couriers manage own documents" ON public.courier_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courier_screenings s
      JOIN public.couriers c ON c.id = s.courier_id
      WHERE s.id = screening_id AND c.user_id = auth.uid()
    )
  );

-- Authenticated users can read screenings (for pharmacy admin UI)
CREATE POLICY "Authenticated read screenings" ON public.courier_screenings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Anyone can report incidents (patients, pharmacies)
CREATE POLICY "Authenticated report incidents" ON public.courier_incidents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated read incidents" ON public.courier_incidents
  FOR SELECT USING (auth.role() = 'authenticated');
