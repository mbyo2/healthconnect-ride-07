-- Yango-level delivery: courier profiles + location sharing
-- Date: 2026-10-10

-- Couriers (riders) — linked to auth.users, managed by pharmacies/institutions
CREATE TABLE IF NOT EXISTS public.couriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pharmacy_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'motorbike' CHECK (vehicle_type IN ('motorbike', 'bicycle', 'car', 'van', 'on_foot')),
  vehicle_plate TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_latitude NUMERIC(10,8),
  current_longitude NUMERIC(11,8),
  last_location_update TIMESTAMPTZ,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW())
);

-- Location sharing for providers (individual pharmacies/doctors on marketplace)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8),
  ADD COLUMN IF NOT EXISTS share_location BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_couriers_pharmacy ON public.couriers(pharmacy_id)
  WHERE is_active = true;

-- RLS
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

-- Couriers can read/update their own profile
CREATE POLICY "Couriers manage own profile" ON public.couriers
  FOR ALL USING (auth.uid() = user_id);

-- Pharmacies can manage their couriers (via institution admin check)
-- Simplified: authenticated users can read active couriers (for assignment UI)
CREATE POLICY "Authenticated read active couriers" ON public.couriers
  FOR SELECT USING (is_active = true);

-- Location updates: allow couriers to insert their own location
-- (delivery_tracking.driver_id references auth.users, couriers link via user_id)
-- The location_updates table already exists; ensure RLS allows courier inserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_updates' AND policyname = 'Couriers insert own location'
  ) THEN
    CREATE POLICY "Couriers insert own location" ON public.location_updates
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.delivery_tracking dt
          JOIN public.couriers c ON c.user_id = dt.driver_id
          WHERE dt.id = delivery_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Patients can read location updates for their own orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'location_updates' AND policyname = 'Patients read own delivery locations'
  ) THEN
    CREATE POLICY "Patients read own delivery locations" ON public.location_updates
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.delivery_tracking dt
          JOIN public.orders o ON o.id = dt.order_id
          WHERE dt.id = delivery_id AND o.patient_id = auth.uid()
        )
      );
  END IF;
END $$;
