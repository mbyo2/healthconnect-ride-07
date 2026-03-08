
-- Add 'pharmacy' to the target_audience check constraint
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_target_audience_check;
ALTER TABLE subscription_plans ADD CONSTRAINT subscription_plans_target_audience_check 
  CHECK (target_audience IN ('provider', 'patient', 'institution', 'pharmacy'));

-- Add pharmacy marketplace listing plan
INSERT INTO subscription_plans (name, slug, description, target_audience, price_monthly, price_annual, currency, features, limits, is_active, sort_order, highlight, plan_type, booking_fee)
VALUES (
  'Pharmacy Listing', 'pharmacy-listing', 'List your pharmacy on Doc'' O Clock marketplace. 2.5% commission on orders.',
  'pharmacy', 200, 2000, 'ZMW',
  '["Marketplace visibility", "Online order receiving", "Prescription fulfillment", "Delivery zone management", "Inventory sync", "2.5% commission on sales"]'::jsonb,
  '{}'::jsonb,
  true, 1, true, 'subscription', 0
);
