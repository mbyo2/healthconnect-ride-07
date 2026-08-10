-- ============================================================
-- Migration: Multi-Country HRMS & General Ledger Accounting System
-- Date: 2026-08-10 (updated with SDL, NHIMA gross basis, NAPSA reduces PAYE)
-- Zambia ZRA/NAPSA/NHIMA/SDL verified 2024/2025 rates
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- 1. CHART OF ACCOUNTS
-- account_type used instead of 'type' (reserved keyword)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID           REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  code            TEXT           NOT NULL,
  name            TEXT           NOT NULL,
  account_type    TEXT           NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
  balance         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_account_code_per_inst UNIQUE (institution_id, code)
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Authenticated users access chart of accounts"
  ON public.chart_of_accounts FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_inst ON public.chart_of_accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(account_type);


-- -----------------------------------------------------------
-- 2. GENERAL LEDGER JOURNAL ENTRIES
-- entry_date used instead of 'date' (reserved keyword)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID           REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  entry_number    TEXT           NOT NULL,
  entry_date      DATE           NOT NULL DEFAULT CURRENT_DATE,
  reference       TEXT,
  description     TEXT           NOT NULL,
  debit_account   TEXT           NOT NULL,
  credit_account  TEXT           NOT NULL,
  amount          DECIMAL(12,2)  NOT NULL CHECK (amount > 0),
  posted_by       UUID           REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access journal entries" ON public.journal_entries;
CREATE POLICY "Authenticated users access journal entries"
  ON public.journal_entries FOR ALL TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_journal_entries_inst ON public.journal_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date);


-- -----------------------------------------------------------
-- 3. COUNTRY STATUTORY & TAX CONFIGURATION
--
-- Zambia ZRA / NAPSA / NHIMA / SDL verified 2024/2025:
--
-- VAT:    16% standard rate (ZRA)
--
-- PAYE (progressive monthly bands):
--   K0     – K5,100   → 0%  (tax-free threshold)
--   K5,101 – K7,100   → 20%
--   K7,101 – K9,200   → 30%
--   Above K9,200      → 37%
--   Taxable income = Gross - NAPSA_employee (NAPSA reduces PAYE base)
--
-- NAPSA (National Pension Scheme Authority):
--   Employee: 5% of gross, capped at K29,816/month
--   Employer: 5% of gross, capped at K29,816/month
--   ✅ NAPSA employee share REDUCES taxable income for PAYE
--
-- NHIMA (National Health Insurance Management Authority):
--   Employee: 1% of TOTAL gross (no ceiling/cap)
--   Employer: 1% of TOTAL gross (no ceiling/cap)
--   ❌ NHIMA does NOT reduce taxable income for PAYE
--
-- SDL (Skills Development Levy):
--   Employer only: 1% of gross monthly payroll
--   Triggered only when annual payroll > ZMW 1,000,000
--
-- All remittances due by 10th of following month
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_statutory_configs (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id            UUID          REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  country_code              TEXT          NOT NULL DEFAULT 'ZM',
  country_name              TEXT          NOT NULL DEFAULT 'Zambia',
  currency                  TEXT          NOT NULL DEFAULT 'ZMW',

  -- VAT
  vat_rate                  DECIMAL(5,2)  DEFAULT 16.00,

  -- PAYE progressive bands
  paye_tax_rate             DECIMAL(5,2)  DEFAULT 37.00,    -- top marginal rate
  paye_band_1_limit         DECIMAL(10,2) DEFAULT 5100.00,  -- 0%  up to this amount
  paye_band_2_limit         DECIMAL(10,2) DEFAULT 7100.00,  -- 20% up to this amount
  paye_band_3_limit         DECIMAL(10,2) DEFAULT 9200.00,  -- 30% up to this amount
  paye_band_1_rate          DECIMAL(5,2)  DEFAULT 0.00,
  paye_band_2_rate          DECIMAL(5,2)  DEFAULT 20.00,
  paye_band_3_rate          DECIMAL(5,2)  DEFAULT 30.00,

  -- NAPSA (reduces PAYE taxable income)
  napsa_employee_rate       DECIMAL(5,2)  DEFAULT 5.00,
  napsa_employer_rate       DECIMAL(5,2)  DEFAULT 5.00,
  napsa_ceiling             DECIMAL(10,2) DEFAULT 29816.00, -- K29,816/month (2024)
  napsa_reduces_paye        BOOLEAN       DEFAULT true,

  -- NHIMA (does NOT reduce PAYE; no ceiling; on total gross)
  nhima_employee_rate       DECIMAL(5,2)  DEFAULT 1.00,
  nhima_employer_rate       DECIMAL(5,2)  DEFAULT 1.00,
  nhima_has_ceiling         BOOLEAN       DEFAULT false,
  nhima_reduces_paye        BOOLEAN       DEFAULT false,

  -- SDL (employer only; triggered when annual payroll > threshold)
  sdl_rate                  DECIMAL(5,2)  DEFAULT 1.00,
  sdl_annual_threshold      DECIMAL(14,2) DEFAULT 1000000.00,
  sdl_enabled               BOOLEAN       DEFAULT true,

  -- Legacy aliases (for backward compatibility)
  pension_rate              DECIMAL(5,2)  DEFAULT 5.00,
  health_levy_rate          DECIMAL(5,2)  DEFAULT 1.00,

  created_at                TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  CONSTRAINT unique_statutory_config_per_inst UNIQUE (institution_id)
);

ALTER TABLE public.country_statutory_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access country statutory configs" ON public.country_statutory_configs;
CREATE POLICY "Authenticated users access country statutory configs"
  ON public.country_statutory_configs FOR ALL TO authenticated USING (true);

-- ============================================================
-- ZAMBIA STATUTORY SUMMARY (ZRA/NAPSA/NHIMA 2024/2025)
-- VAT:   16% — standard rate on all taxable supply (ZRA)
-- PAYE:  Progressive: 0%|20%|30%|37% on K0-5100|5101-7100|7101-9200|>9200
--        Taxable income = Gross MINUS NAPSA employee share
-- NAPSA: 5%+5% (emp+employer), cap K29,816/mo. Reduces PAYE base.
-- NHIMA: 1%+1% (emp+employer), NO cap, on total gross. Does NOT reduce PAYE.
-- SDL:   1% employer only, triggered if annual payroll > K1,000,000
-- Remit: All by 10th of following month
-- ============================================================
