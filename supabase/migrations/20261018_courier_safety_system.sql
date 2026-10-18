-- Courier safety system: verification, tamper-evident seals, photo proof, incidents
-- Safer than Yango: every handoff is documented, sealed, and tracked

-- Courier verification documents
CREATE TABLE IF NOT EXISTS public.courier_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'national_id', 'drivers_license', 'vehicle_registration',
    'police_clearance', 'medical_fitness', 'profile_photo'
  )),
  document_url TEXT NOT NULL,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tamper-evident seal tracking
CREATE TABLE IF NOT EXISTS public.delivery_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  seal_number TEXT NOT NULL UNIQUE,
  sealed_by UUID REFERENCES auth.users(id),
  sealed_at TIMESTAMPTZ DEFAULT NOW(),
  seal_photo_url TEXT,
  -- Verification at delivery
  verified_intact BOOLEAN,
  verified_by_patient BOOLEAN DEFAULT false,
  verification_photo_url TEXT,
  broken_seal_reported BOOLEAN DEFAULT false,
  broken_seal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo proof at pickup and delivery
CREATE TABLE IF NOT EXISTS public.delivery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN (
    'pickup_package', 'pickup_seal', 'delivery_handoff', 'delivery_seal', 'damage_evidence'
  )),
  photo_url TEXT NOT NULL,
  taken_by UUID REFERENCES auth.users(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident reports (damage, theft, misconduct)
CREATE TABLE IF NOT EXISTS public.delivery_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id UUID REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'package_damaged', 'package_tampered', 'theft_suspected', 'courier_misconduct',
    'late_delivery', 'wrong_address', 'patient_unavailable', 'vehicle_breakdown', 'other'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courier ratings (from patients and pharmacies)
CREATE TABLE IF NOT EXISTS public.courier_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  -- Safety-specific ratings
  package_handling INTEGER CHECK (package_handling >= 1 AND package_handling <= 5),
  professionalism INTEGER CHECK (professionalism >= 1 AND professionalism <= 5),
  timeliness INTEGER CHECK (timeliness >= 1 AND timeliness <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(delivery_order_id, rated_by)
);

-- Add safety columns to couriers
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  verification_status TEXT DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'suspended', 'rejected')
  );
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  background_check_passed BOOLEAN DEFAULT false;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  safety_training_completed BOOLEAN DEFAULT false;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  id_number TEXT;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  emergency_contact TEXT;
ALTER TABLE public.couriers ADD COLUMN IF NOT EXISTS
  emergency_phone TEXT;

-- Add seal requirement to delivery orders
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS
  requires_seal BOOLEAN DEFAULT true;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS
  seal_verified BOOLEAN DEFAULT false;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS
  pickup_photo_required BOOLEAN DEFAULT true;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS
  delivery_photo_required BOOLEAN DEFAULT true;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courier_verifications_courier ON public.courier_verifications(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_seals_order ON public.delivery_seals(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_order ON public.delivery_photos(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_incidents_courier ON public.delivery_incidents(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_incidents_status ON public.delivery_incidents(status);
CREATE INDEX IF NOT EXISTS idx_courier_ratings_courier ON public.courier_ratings(courier_id);

-- Enable RLS
ALTER TABLE public.courier_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_seals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;

-- Couriers can view their own verifications
CREATE POLICY "Couriers view own verifications"
ON public.courier_verifications FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.couriers WHERE couriers.id = courier_verifications.courier_id AND couriers.user_id = auth.uid())
);

-- Institution admins can verify their couriers
CREATE POLICY "Institution admins manage courier verifications"
ON public.courier_verifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.couriers
    JOIN public.healthcare_institutions ON healthcare_institutions.id = couriers.institution_id
    WHERE couriers.id = courier_verifications.courier_id
    AND healthcare_institutions.admin_id = auth.uid()
  )
);

-- Seals: visible to patient, courier, pharmacy staff
CREATE POLICY "View delivery seals"
ON public.delivery_seals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE delivery_orders.id = delivery_seals.delivery_order_id
    AND (
      delivery_orders.patient_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.couriers WHERE couriers.id = delivery_orders.courier_id AND couriers.user_id = auth.uid())
      OR (delivery_orders.pharmacy_id IS NOT NULL AND public.is_institution_staff_member(delivery_orders.pharmacy_id))
    )
  )
);

CREATE POLICY "Create delivery seals"
ON public.delivery_seals FOR INSERT
WITH CHECK (true);

-- Photos: same visibility as seals
CREATE POLICY "View delivery photos"
ON public.delivery_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_orders
    WHERE delivery_orders.id = delivery_photos.delivery_order_id
    AND (
      delivery_orders.patient_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.couriers WHERE couriers.id = delivery_orders.courier_id AND couriers.user_id = auth.uid())
      OR (delivery_orders.pharmacy_id IS NOT NULL AND public.is_institution_staff_member(delivery_orders.pharmacy_id))
    )
  )
);

CREATE POLICY "Create delivery photos"
ON public.delivery_photos FOR INSERT
WITH CHECK (true);

-- Incidents: reporter, involved courier, admins can view
CREATE POLICY "View incidents"
ON public.delivery_incidents FOR SELECT
USING (
  reported_by = auth.uid()
  OR EXISTS (SELECT 1 FROM public.couriers WHERE couriers.id = delivery_incidents.courier_id AND couriers.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('super_admin', 'admin'))
);

CREATE POLICY "Report incidents"
ON public.delivery_incidents FOR INSERT
WITH CHECK (reported_by = auth.uid());

-- Ratings: visible to all, creatable by patient/pharmacy
CREATE POLICY "View courier ratings"
ON public.courier_ratings FOR SELECT
USING (true);

CREATE POLICY "Create courier ratings"
ON public.courier_ratings FOR INSERT
WITH CHECK (rated_by = auth.uid());
