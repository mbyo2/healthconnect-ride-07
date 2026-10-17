-- Multi-country customization architecture
--
-- Research (2026-10-17, multi-country-expansion-research.md): each country
-- has its own currency, payment rails, insurance schemes, data-protection
-- law, EPI schedule, and price levels. Hardcoding Zambia everywhere blocks
-- expansion.
--
-- Design: resolution order is institution override -> country default ->
-- platform fallback. Zambia is seeded from today's hardcoded values so
-- existing behavior is byte-for-byte unchanged. New countries onboard by
-- inserting rows, never by changing code.
--
-- 1. country_configurations: one row per country (currency, rails,
--    insurance, data-protection, licensing, EPI, ANC, languages).
-- 2. country_default_tariffs: per-country starter price book in local
--    currency (the "Load starter tariffs" source).
-- 3. healthcare_institutions.country_code (default 'ZM').

CREATE TABLE IF NOT EXISTS public.country_configurations (
  country_code text PRIMARY KEY CHECK (country_code ~ '^[A-Z]{2}$'),
  country_name text NOT NULL,
  currency_code text NOT NULL,
  currency_symbol text NOT NULL,
  currency_locale text NOT NULL DEFAULT 'en',
  usd_reference_rate numeric(14,4),
  payment_rails jsonb NOT NULL DEFAULT '[]'::jsonb,
  insurance_schemes jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_protection jsonb NOT NULL DEFAULT '{}'::jsonb,
  facility_licensing jsonb NOT NULL DEFAULT '[]'::jsonb,
  epi_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  anc_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.country_default_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.country_configurations(country_code) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('opd','lab','radiology','dental','surgery','pharmacy','ward','emergency','other')),
  department text,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  insurance_price numeric(12,2),
  price_source text NOT NULL DEFAULT 'est' CHECK (price_source IN ('confirmed','est')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT country_default_tariffs_unique UNIQUE (country_code, code)
);
CREATE INDEX IF NOT EXISTS idx_country_default_tariffs_country ON public.country_default_tariffs(country_code, category);

ALTER TABLE public.healthcare_institutions
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'ZM' CHECK (country_code ~ '^[A-Z]{2}$');

-- RLS: country configs and default tariffs are public reference data.
ALTER TABLE public.country_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_default_tariffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read country configurations" ON public.country_configurations;
CREATE POLICY "Anyone can read country configurations" ON public.country_configurations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can read country default tariffs" ON public.country_default_tariffs;
CREATE POLICY "Anyone can read country default tariffs" ON public.country_default_tariffs FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.country_configurations IS 'Per-country defaults: currency, payment rails, insurance, regulation, EPI/ANC schedules. Institution rows override these.';
COMMENT ON TABLE public.country_default_tariffs IS 'Per-country starter tariff book in local currency. Seeded from research; institutions override via service_tariffs.';
