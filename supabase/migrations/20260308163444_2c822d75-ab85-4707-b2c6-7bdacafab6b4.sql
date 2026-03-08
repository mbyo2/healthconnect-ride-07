
-- Update pharmacy commission from 5% to 2.5%
UPDATE commission_settings SET commission_percentage = 2.50, updated_at = now() WHERE entity_type = 'pharmacy';

-- Redistribute: app_owner stays 10%, institution 15%, health_personnel gets the extra 2.5% = 72.5%
-- Wait - total must be 100%. Currently: 10 + 15 + 75 + 5 = 105 (was already wrong?)
-- Let's check the defaults: app_owner 10, institution 15, health_personnel 75, pharmacy 5 = 105
-- With pharmacy at 2.5: 10 + 15 + 75 + 2.5 = 102.5
-- Adjust health_personnel to 72.5 to make it 100
UPDATE commission_settings SET commission_percentage = 72.50, updated_at = now() WHERE entity_type = 'health_personnel';

-- Delete existing subscription plans and recreate with Zocdoc-like Zambian pricing
DELETE FROM subscription_plans WHERE target_audience IN ('provider', 'institution');

-- Provider plans - Zocdoc model adapted for Zambia (cheaper)
-- Tier 1: Pay-per-booking only (free to list, K50 per new patient)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Starter', 'provider-starter', 'List your practice for free. Pay only when you get new patients.',
  'provider', 0, 0, 'ZMW',
  '["Basic profile listing", "Up to 10 new patient bookings/month", "Appointment reminders", "Patient messaging", "Basic analytics"]'::jsonb,
  '{"max_bookings_per_month": 10}'::jsonb,
  true, 1, false, 'pay_per_booking', 50
);

-- Tier 2: Professional (K500/mo, K35 booking fee)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Professional', 'provider-professional', 'Grow your practice with priority visibility and lower booking fees.',
  'provider', 500, 5000, 'ZMW',
  '["Priority search listing", "Up to 50 new patient bookings/month", "Appointment reminders & no-show tracking", "Patient messaging & chat", "Revenue analytics", "30-day free trial"]'::jsonb,
  '{"max_bookings_per_month": 50}'::jsonb,
  true, 2, true, 'subscription', 35
);

-- Tier 3: Premium (K1500/mo, K20 booking fee)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Premium', 'provider-premium', 'Maximum visibility, lowest fees, team management.',
  'provider', 1500, 15000, 'ZMW',
  '["Featured listing with badge", "Unlimited new patient bookings", "No-show fee protection", "Team management (up to 5 staff)", "Advanced analytics & reports", "Embeddable booking widget", "30-day free trial"]'::jsonb,
  '{"max_bookings_per_month": -1, "max_team_members": 5}'::jsonb,
  true, 3, false, 'subscription', 20
);

-- Tier 4: Enterprise Provider (K3000/mo, K0 booking fee)
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Enterprise', 'provider-enterprise', 'For high-volume practices. Zero booking fees, full suite.',
  'provider', 3000, 30000, 'ZMW',
  '["Top-tier search placement", "Zero booking fees", "Unlimited everything", "Team management (unlimited)", "White-label booking page", "Dedicated support", "API access", "30-day free trial"]'::jsonb,
  '{"max_bookings_per_month": -1, "max_team_members": -1}'::jsonb,
  true, 4, false, 'subscription', 0
);

-- Institution plans - HMS subscription (annual billing)
-- Small Clinic HMS
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee, max_beds, max_users, max_doctors)
VALUES (
  'Clinic Basic', 'institution-clinic-basic', 'Lightweight HMS for small clinics. Marketplace listing optional.',
  'institution', 0, 8000, 'ZMW',
  '["Full HMS access", "Up to 20 beds", "10 staff accounts", "5 doctor accounts", "OPD management", "Basic billing & invoicing", "Patient records", "Marketplace listing add-on: K200/mo"]'::jsonb,
  '{"marketplace_listing_fee": 200}'::jsonb,
  true, 1, false, 'subscription', 0, 20, 10, 5
);

-- Medium Hospital HMS
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee, max_beds, max_users, max_doctors)
VALUES (
  'Hospital Standard', 'institution-hospital-standard', 'Complete HMS for mid-size hospitals with marketplace access.',
  'institution', 0, 20000, 'ZMW',
  '["Full HMS with all modules", "Up to 100 beds", "50 staff accounts", "25 doctor accounts", "OPD/IPD/LIMS/RIS", "Advanced billing & insurance", "Marketplace listing included", "Revenue analytics"]'::jsonb,
  '{}'::jsonb,
  true, 2, true, 'subscription', 0, 100, 50, 25
);

-- Large Hospital HMS
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee, max_beds, max_users, max_doctors)
VALUES (
  'Hospital Enterprise', 'institution-hospital-enterprise', 'Enterprise-grade HMS with unlimited capacity and priority support.',
  'institution', 0, 45000, 'ZMW',
  '["Full HMS — all modules unlocked", "Unlimited beds, staff & doctors", "Multi-branch support", "Blood bank, OT, pharmacy modules", "Custom integrations & API access", "Marketplace listing included", "Dedicated account manager", "SLA-backed uptime guarantee"]'::jsonb,
  '{}'::jsonb,
  true, 3, false, 'subscription', 0, null, null, null
);

-- Create no_show_fees table for tracking no-show charges
CREATE TABLE IF NOT EXISTS public.no_show_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 25.00,
  currency text NOT NULL DEFAULT 'ZMW',
  status text NOT NULL DEFAULT 'pending',
  charged_at timestamptz,
  waived_at timestamptz,
  waived_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.no_show_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their no-show fees"
  ON no_show_fees FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR patient_id = auth.uid());

CREATE POLICY "Service role manages no-show fees"
  ON no_show_fees FOR ALL TO authenticated
  USING (public.is_service_role());
