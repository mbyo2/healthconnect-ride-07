-- Update subscription plan pricing to Kwacha rates (Sep 2026).
-- Annual figures are exactly 12 × monthly; no discount is invented.
-- Clinic Basic set at K8,500/mo: ~2.4× Insta HMS's clinic entry (~K3,500/mo),
-- justified by bundled Teledoctor patient acquisition + local Zambian support.

-- Pharmacy marketplace listing: K200/mo -> K1,100/mo (K13,200/yr)
UPDATE subscription_plans
SET price_monthly = 1100,
    price_annual = 13200,
    updated_at = now()
WHERE slug = 'pharmacy-listing';

-- Clinic Basic HMS: K8,500/mo (K102,000/yr)
-- Marketplace listing add-on: K200/mo -> K5,000/mo (K60,000/yr)
UPDATE subscription_plans
SET price_monthly = 8500,
    price_annual = 102000,
    features = (
      SELECT jsonb_agg(
        CASE WHEN value = to_jsonb('Marketplace listing add-on: K200/mo'::text)
             THEN to_jsonb('Marketplace listing add-on: K5,000/mo (K60,000/yr)'::text)
             ELSE value
        END
      )
      FROM jsonb_array_elements(features)
    ),
    limits = jsonb_set(COALESCE(limits, '{}'::jsonb), '{marketplace_listing_fee}', '5000'),
    updated_at = now()
WHERE slug = 'institution-clinic-basic';

-- Hospital Standard HMS: K22,000/mo (K264,000/yr)
UPDATE subscription_plans
SET price_monthly = 22000,
    price_annual = 264000,
    updated_at = now()
WHERE slug = 'institution-hospital-standard';

-- Hospital Enterprise HMS: K90,500/mo (K1,086,000/yr)
UPDATE subscription_plans
SET price_monthly = 90500,
    price_annual = 1086000,
    updated_at = now()
WHERE slug = 'institution-hospital-enterprise';
