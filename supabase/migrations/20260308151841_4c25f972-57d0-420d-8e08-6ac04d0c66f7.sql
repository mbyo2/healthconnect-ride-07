
-- Drop old subscription plans and recreate with ZocDoc/MocDoc model
DELETE FROM user_subscriptions;
DELETE FROM subscription_plans;

-- Add new columns for the hybrid pricing model
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'subscription';
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS booking_fee numeric(10,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_beds integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_users integer;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_doctors integer;

-- Insert Patient plan (FREE)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES 
('Patient Free', 'patient-free', 'Book appointments, access health records, and use AI symptom checker — completely free.', 'patient', 0, 0, 'ZMW', 
 '["Unlimited appointment booking", "Health records access", "AI symptom checker", "Medication reminders", "Emergency services directory", "Mobile money payments"]'::jsonb,
 '{}'::jsonb, true, 1, false, 'free', 0);

-- Insert Provider plans
-- Pay-per-booking (default for all providers)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES 
('Pay Per Booking', 'provider-pay-per-booking', 'No monthly fees. Only pay K150 when a new patient books through Doc O Clock.', 'provider', 0, 0, 'ZMW',
 '["K150 per new patient booking", "Basic provider profile", "Appointment management", "Patient messaging", "No monthly commitment", "Cancel anytime"]'::jsonb,
 '{"booking_fee": 150}'::jsonb, true, 10, false, 'pay_per_booking', 150);

INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES 
('Basic Listing', 'provider-basic', 'Enhance your visibility with a verified profile and priority placement.', 'provider', 1000, 10000, 'ZMW',
 '["Everything in Pay Per Booking", "Verified badge on profile", "Priority in search results", "Online booking widget", "Patient reviews display", "Basic analytics"]'::jsonb,
 '{"booking_fee": 150}'::jsonb, true, 11, false, 'subscription', 150);

INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES 
('Premium Listing', 'provider-premium', 'Maximum visibility with promoted placement and advanced practice tools.', 'provider', 2500, 25000, 'ZMW',
 '["Everything in Basic Listing", "Top placement in search", "Promoted listing badge", "Advanced analytics dashboard", "Teleconsultation tools", "Multi-location support", "Custom booking page"]'::jsonb,
 '{"booking_fee": 100}'::jsonb, true, 12, true, 'subscription', 100);

INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES 
('Elite Listing', 'provider-elite', 'The ultimate practice growth package with dedicated support and maximum reach.', 'provider', 5000, 50000, 'ZMW',
 '["Everything in Premium Listing", "Featured on homepage", "Dedicated account manager", "Priority patient matching", "API access for integrations", "Custom branding", "Unlimited teleconsultations", "FHIR data export"]'::jsonb,
 '{"booking_fee": 0}'::jsonb, true, 13, false, 'subscription', 0);

-- Insert Institution plans (MocDoc-style, annual pricing)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, max_beds, max_users, max_doctors)
VALUES 
('Starter', 'institution-starter', 'Perfect for small clinics and healthcare facilities getting started with digital management.', 'institution', 833, 10000, 'ZMW',
 '["Up to 20 beds", "15 staff logins", "10 doctor accounts", "Appointment scheduling", "Patient records (EMR)", "Basic billing & invoicing", "Inventory management", "Email support"]'::jsonb,
 '{"beds": 20, "users": 15, "doctors": 10}'::jsonb, true, 20, false, 'subscription', 20, 15, 10);

INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, max_beds, max_users, max_doctors)
VALUES 
('Growth', 'institution-growth', 'For growing hospitals that need advanced features and more capacity.', 'institution', 2083, 25000, 'ZMW',
 '["Up to 50 beds", "30 staff logins", "20 doctor accounts", "Everything in Starter", "Multi-department management", "Advanced analytics & reporting", "Lab & radiology integration", "Insurance claims processing", "Priority support"]'::jsonb,
 '{"beds": 50, "users": 30, "doctors": 20}'::jsonb, true, 21, true, 'subscription', 50, 30, 20);

INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, max_beds, max_users, max_doctors)
VALUES 
('Advanced', 'institution-advanced', 'Enterprise-grade solution for large hospitals with full feature access.', 'institution', 4167, 50000, 'ZMW',
 '["Up to 100 beds", "50 staff logins", "40 doctor accounts", "Everything in Growth", "FHIR/HL7 data export", "IoT device integration", "Custom workflows", "API access", "Dedicated account manager", "On-site training", "24/7 priority support"]'::jsonb,
 '{"beds": 100, "users": 50, "doctors": 40}'::jsonb, true, 22, false, 'subscription', 100, 50, 40);

-- Create booking_fees table to track per-booking charges
CREATE TABLE IF NOT EXISTS public.booking_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 150,
  currency text NOT NULL DEFAULT 'ZMW',
  status text NOT NULL DEFAULT 'pending',
  charged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their booking fees"
  ON public.booking_fees FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "System can insert booking fees"
  ON public.booking_fees FOR INSERT TO authenticated
  WITH CHECK (true);

-- Function to charge booking fee when new patient books
CREATE OR REPLACE FUNCTION public.charge_booking_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_new_patient boolean;
  v_booking_fee numeric(10,2);
  v_provider_plan record;
BEGIN
  -- Check if this is a NEW patient for this provider (first appointment)
  SELECT NOT EXISTS(
    SELECT 1 FROM appointments 
    WHERE patient_id = NEW.patient_id 
    AND provider_id = NEW.provider_id
    AND id != NEW.id
    AND status NOT IN ('cancelled')
  ) INTO v_is_new_patient;

  IF v_is_new_patient THEN
    -- Get the provider's current plan booking fee
    SELECT sp.booking_fee INTO v_booking_fee
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = NEW.provider_id
    AND us.status IN ('active', 'trialing')
    ORDER BY us.created_at DESC
    LIMIT 1;

    -- Default to K150 if no plan found
    IF v_booking_fee IS NULL THEN
      v_booking_fee := 150;
    END IF;

    -- Only charge if fee > 0
    IF v_booking_fee > 0 THEN
      INSERT INTO booking_fees (provider_id, patient_id, appointment_id, amount, status)
      VALUES (NEW.provider_id, NEW.patient_id, NEW.id, v_booking_fee, 'pending');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on appointments
DROP TRIGGER IF EXISTS trg_charge_booking_fee ON appointments;
CREATE TRIGGER trg_charge_booking_fee
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION charge_booking_fee();
