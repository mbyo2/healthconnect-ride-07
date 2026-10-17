-- Add income_level to country_configurations for price-level scaling.
-- Used by the starter-tariff loader to convert Zambia base prices to
-- sensible local defaults for countries without a researched tariff book.

ALTER TABLE public.country_configurations
  ADD COLUMN IF NOT EXISTS income_level text NOT NULL DEFAULT 'lower_middle'
  CHECK (income_level IN ('high', 'upper_middle', 'lower_middle', 'low'));

COMMENT ON COLUMN public.country_configurations.income_level IS
  'World Bank income classification; scales Zambia base prices to local price levels for starter tariff books.';
