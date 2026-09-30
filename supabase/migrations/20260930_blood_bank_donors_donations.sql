-- ============================================================
-- Doc'O Clock — Blood bank: donors, donations, compatibility
-- Adds the missing blood bank workflows:
--   1. Donor registration/management
--   2. Donation tracking (links to inventory)
--   3. Compatibility/crossmatch testing (links to requests)
-- ============================================================

-- 1. Blood donors
CREATE TABLE IF NOT EXISTS public.blood_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  blood_type TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  last_donation_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_donors_hospital ON public.blood_donors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_donors_blood_type ON public.blood_donors(blood_type);

-- 2. Blood donations (each donation creates/updates inventory)
CREATE TABLE IF NOT EXISTS public.blood_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.blood_donors(id) ON DELETE SET NULL,
  blood_type TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT 'whole_blood',
  units_collected NUMERIC DEFAULT 1,
  donation_date TIMESTAMPTZ DEFAULT now(),
  expiry_date DATE,
  collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  screening_status TEXT DEFAULT 'pending',
  screening_notes TEXT,
  inventory_id UUID REFERENCES public.blood_bank_inventory(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_donations_hospital ON public.blood_donations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_donations_donor ON public.blood_donations(donor_id);

-- 3. Compatibility / crossmatch tests
CREATE TABLE IF NOT EXISTS public.blood_compatibility_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.blood_bank_requests(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  donor_blood_type TEXT NOT NULL,
  recipient_blood_type TEXT NOT NULL,
  test_type TEXT DEFAULT 'crossmatch',
  result TEXT DEFAULT 'pending',
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_compat_hospital ON public.blood_compatibility_tests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_compat_request ON public.blood_compatibility_tests(request_id);

-- RLS: enable and allow institution members to manage
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_compatibility_tests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Institution members manage donors" ON public.blood_donors;
DROP POLICY IF EXISTS "Institution members manage donations" ON public.blood_donations;
DROP POLICY IF EXISTS "Institution members manage compatibility" ON public.blood_compatibility_tests;

-- Simple permissive policies for authenticated users
-- (refine with institution membership checks as needed)
CREATE POLICY "Institution members manage donors"
  ON public.blood_donors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Institution members manage donations"
  ON public.blood_donations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Institution members manage compatibility"
  ON public.blood_compatibility_tests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger: update donor's last_donation_date when a donation is recorded
CREATE OR REPLACE FUNCTION public.update_donor_last_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.donor_id IS NOT NULL THEN
    UPDATE public.blood_donors
    SET last_donation_date = NEW.donation_date::date,
        updated_at = now()
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_donor_last_donation ON public.blood_donations;
CREATE TRIGGER trg_update_donor_last_donation
  AFTER INSERT ON public.blood_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_donor_last_donation();
