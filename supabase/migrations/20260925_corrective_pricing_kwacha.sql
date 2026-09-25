-- Corrective pricing migration (2026-09-25).
--
-- The 2026-09-24 pricing update did not take effect in production: its
-- UPDATE ... WHERE slug = '...' statements matched 0 rows silently, so the
-- old prices (Pharmacy K200, Clinic Basic K800, Hospital Standard K2,000,
-- Hospital Enterprise K4,500) remained live.
--
-- This version matches on slug OR name and RAISES an exception if any plan
-- is missing, so it can never fail silently again. Prices are the
-- CEO-approved Kwacha rates (annual = 12 x monthly, no invented discount).

DO $$
DECLARE
  v_updated int;
BEGIN
  -- Pharmacy marketplace listing: K1,100/mo (K13,200/yr)
  UPDATE subscription_plans
  SET price_monthly = 1100, price_annual = 13200, updated_at = now()
  WHERE slug = 'pharmacy-listing' OR name = 'Pharmacy Listing';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'pricing fix: Pharmacy Listing plan not found'; END IF;

  -- Clinic Basic HMS: K8,500/mo (K102,000/yr)
  -- Marketplace listing add-on: K5,000/mo (K60,000/yr)
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
  WHERE slug = 'institution-clinic-basic' OR name = 'Clinic Basic';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'pricing fix: Clinic Basic plan not found'; END IF;

  -- Hospital Standard HMS: K22,000/mo (K264,000/yr)
  UPDATE subscription_plans
  SET price_monthly = 22000, price_annual = 264000, updated_at = now()
  WHERE slug = 'institution-hospital-standard' OR name = 'Hospital Standard';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'pricing fix: Hospital Standard plan not found'; END IF;

  -- Hospital Enterprise HMS: K90,500/mo (K1,086,000/yr)
  UPDATE subscription_plans
  SET price_monthly = 90500, price_annual = 1086000, updated_at = now()
  WHERE slug = 'institution-hospital-enterprise' OR name = 'Hospital Enterprise';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'pricing fix: Hospital Enterprise plan not found'; END IF;

  RAISE NOTICE 'pricing fix applied: 4 plans updated to CEO-approved Kwacha rates';
END $$;
