
-- Remove existing provider plans and recreate as pure pay-per-booking
DELETE FROM subscription_plans WHERE target_audience = 'provider';

-- Single provider marketplace plan: pay-per-booking only, no monthly fee
-- Fee varies by specialty tier (stored in booking_fee as base, actual fee calculated by specialty)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Marketplace Listing', 'provider-marketplace', 'List your practice on Doc'' O Clock. Pay only when new patients book.',
  'provider', 0, 0, 'ZMW',
  '["Free profile & listing", "Pay only for new patient bookings", "Appointment reminders & no-show alerts", "Patient messaging", "Analytics dashboard", "Video consultations", "Prescription management"]'::jsonb,
  '{}'::jsonb,
  true, 1, true, 'pay_per_booking', 0
);

-- Create specialty-based booking fee table
CREATE TABLE IF NOT EXISTS public.specialty_booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty text NOT NULL,
  location_tier text NOT NULL DEFAULT 'standard',
  booking_fee numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(specialty, location_tier)
);

ALTER TABLE public.specialty_booking_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read specialty fees"
  ON specialty_booking_fees FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage specialty fees"
  ON specialty_booking_fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed specialty booking fees (Zambian pricing, varies by specialty like Zocdoc)
INSERT INTO specialty_booking_fees (specialty, location_tier, booking_fee) VALUES
  ('General Practice', 'standard', 35),
  ('General Practice', 'premium', 50),
  ('Cardiology', 'standard', 75),
  ('Cardiology', 'premium', 100),
  ('Dermatology', 'standard', 60),
  ('Dermatology', 'premium', 85),
  ('Pediatrics', 'standard', 40),
  ('Pediatrics', 'premium', 60),
  ('Orthopedics', 'standard', 80),
  ('Orthopedics', 'premium', 110),
  ('Gynecology', 'standard', 65),
  ('Gynecology', 'premium', 90),
  ('Psychiatry', 'standard', 55),
  ('Psychiatry', 'premium', 75),
  ('ENT', 'standard', 50),
  ('ENT', 'premium', 70),
  ('Ophthalmology', 'standard', 60),
  ('Ophthalmology', 'premium', 85),
  ('Dentistry', 'standard', 45),
  ('Dentistry', 'premium', 65),
  ('Urology', 'standard', 70),
  ('Urology', 'premium', 95),
  ('Neurology', 'standard', 80),
  ('Neurology', 'premium', 110),
  ('Oncology', 'standard', 90),
  ('Oncology', 'premium', 120),
  ('Radiology', 'standard', 50),
  ('Radiology', 'premium', 70),
  ('Laboratory Services', 'standard', 30),
  ('Laboratory Services', 'premium', 45),
  ('Physiotherapy', 'standard', 35),
  ('Physiotherapy', 'premium', 50),
  ('Mental Health', 'standard', 50),
  ('Mental Health', 'premium', 70)
ON CONFLICT (specialty, location_tier) DO NOTHING;

-- Update the charge_booking_fee function to use specialty-based fees
CREATE OR REPLACE FUNCTION public.charge_booking_fee()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_is_new_patient boolean;
  v_booking_fee numeric(10,2);
  v_provider_specialty text;
  v_location_tier text;
BEGIN
  -- Check if this is a NEW patient for this provider
  SELECT NOT EXISTS(
    SELECT 1 FROM appointments 
    WHERE patient_id = NEW.patient_id 
    AND provider_id = NEW.provider_id
    AND id != NEW.id
    AND status NOT IN ('cancelled')
  ) INTO v_is_new_patient;

  IF v_is_new_patient THEN
    -- Get provider specialty
    SELECT COALESCE(hpa.specialty, 'General Practice') INTO v_provider_specialty
    FROM health_personnel_applications hpa
    WHERE hpa.user_id = NEW.provider_id AND hpa.status = 'approved'
    LIMIT 1;

    -- Default location tier (could be enhanced with actual location logic)
    v_location_tier := 'standard';

    -- Look up specialty-based fee
    SELECT sbf.booking_fee INTO v_booking_fee
    FROM specialty_booking_fees sbf
    WHERE sbf.specialty = v_provider_specialty
    AND sbf.location_tier = v_location_tier
    AND sbf.is_active = true;

    -- Fallback to K50 if no specialty fee found
    IF v_booking_fee IS NULL THEN
      v_booking_fee := 50;
    END IF;

    -- Only charge if fee > 0
    IF v_booking_fee > 0 THEN
      INSERT INTO booking_fees (provider_id, patient_id, appointment_id, amount, status)
      VALUES (NEW.provider_id, NEW.patient_id, NEW.id, v_booking_fee, 'pending');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
