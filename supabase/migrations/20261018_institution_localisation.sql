-- Odoo-style customisable localisation per institution
-- Adds flexible PAYE brackets (JSONB, unlimited bands) + fiscal year start
-- to country_statutory_configs. Backfills Zambia defaults from existing columns.

-- 1) Flexible PAYE brackets: array of {min, max, rate}
--    rate is decimal (0.37 = 37%). max = null means no upper limit.
ALTER TABLE public.country_statutory_configs
  ADD COLUMN IF NOT EXISTS paye_brackets JSONB;

-- 2) Fiscal year start month (1-12)
ALTER TABLE public.country_statutory_configs
  ADD COLUMN IF NOT EXISTS fiscal_year_start INT DEFAULT 1
  CHECK (fiscal_year_start BETWEEN 1 AND 12);

-- 2b) NHIMA/health ceiling (null = no ceiling, like Zambia's uncapped 1%)
ALTER TABLE public.country_statutory_configs
  ADD COLUMN IF NOT EXISTS nhima_ceiling DECIMAL(10,2);

-- 3) Backfill Zambia defaults from the rigid band columns for existing rows
--    that don't have paye_brackets yet.
UPDATE public.country_statutory_configs
SET paye_brackets = jsonb_build_array(
  jsonb_build_object('min', 0, 'max', COALESCE(paye_band_1_limit, 5100), 'rate', COALESCE(paye_band_1_rate, 0) / 100.0),
  jsonb_build_object('min', COALESCE(paye_band_1_limit, 5100), 'max', COALESCE(paye_band_2_limit, 7100), 'rate', COALESCE(paye_band_2_rate, 20) / 100.0),
  jsonb_build_object('min', COALESCE(paye_band_2_limit, 7100), 'max', COALESCE(paye_band_3_limit, 9200), 'rate', COALESCE(paye_band_3_rate, 30) / 100.0),
  jsonb_build_object('min', COALESCE(paye_band_3_limit, 9200), 'max', NULL, 'rate', COALESCE(paye_tax_rate, 37) / 100.0)
)
WHERE paye_brackets IS NULL;

-- 4) Ensure fiscal_year_start defaults for existing rows
UPDATE public.country_statutory_configs
SET fiscal_year_start = 1
WHERE fiscal_year_start IS NULL;

-- 5) RLS: already tightened by 20261018_accounting_rls_tighten.sql
--    (institution-scoped read/write). No changes needed here.
