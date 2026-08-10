-- ============================================================
-- Migration: Multi-Country HRMS & General Ledger Accounting System
-- Date: 2026-08-10
-- FIX: 'type' renamed to 'account_type', 'date' renamed to 'entry_date'
--      (both are reserved keywords in PostgreSQL)
-- Zambia statutory rates verified from ZRA, NAPSA, NHIMA (2024/2025)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- 1. CHART OF ACCOUNTS TABLE
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
-- NOTE: 'date' renamed to 'entry_date' — reserved keyword in PostgreSQL
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
-- Zambia defaults verified from official sources (2024/2025):
--   VAT:     16%  — ZRA standard rate
--   PAYE:    Progressive bands (0%/20%/30%/37%)
--   NAPSA:   5% employee + 5% employer, capped at K29,816/month
--   NHIMA:   1% employee + 1% employer, on BASIC salary only
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_statutory_configs (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id        UUID          REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  country_code          TEXT          NOT NULL DEFAULT 'ZM',
  country_name          TEXT          NOT NULL DEFAULT 'Zambia',
  currency              TEXT          NOT NULL DEFAULT 'ZMW',
  vat_rate              DECIMAL(5,2)  DEFAULT 16.00,
  paye_tax_rate         DECIMAL(5,2)  DEFAULT 37.00,
  paye_band_1_limit     DECIMAL(10,2) DEFAULT 5100.00,
  paye_band_2_limit     DECIMAL(10,2) DEFAULT 7100.00,
  paye_band_3_limit     DECIMAL(10,2) DEFAULT 9200.00,
  paye_band_1_rate      DECIMAL(5,2)  DEFAULT 0.00,
  paye_band_2_rate      DECIMAL(5,2)  DEFAULT 20.00,
  paye_band_3_rate      DECIMAL(5,2)  DEFAULT 30.00,
  napsa_employee_rate   DECIMAL(5,2)  DEFAULT 5.00,
  napsa_employer_rate   DECIMAL(5,2)  DEFAULT 5.00,
  napsa_ceiling         DECIMAL(10,2) DEFAULT 29816.00,
  nhima_employee_rate   DECIMAL(5,2)  DEFAULT 1.00,
  nhima_employer_rate   DECIMAL(5,2)  DEFAULT 1.00,
  pension_rate          DECIMAL(5,2)  DEFAULT 5.00,
  health_levy_rate      DECIMAL(5,2)  DEFAULT 1.00,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_statutory_config_per_inst UNIQUE (institution_id)
);

ALTER TABLE public.country_statutory_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access country statutory configs" ON public.country_statutory_configs;
CREATE POLICY "Authenticated users access country statutory configs"
  ON public.country_statutory_configs FOR ALL TO authenticated USING (true);

-- ============================================================
-- ZAMBIA STATUTORY SUMMARY (ZRA/NAPSA/NHIMA 2024/2025):
-- VAT:   16% standard rate on taxable goods & services (ZRA)
-- PAYE:  0% on K0-5,100 | 20% on K5,101-7,100 | 30% on K7,101-9,200 | 37% above K9,200
-- NAPSA: Employee 5% + Employer 5% = 10% total, capped at K29,816/month gross
-- NHIMA: Employee 1% + Employer 1% = 2% total, on BASIC salary only
-- Remittance: All due by 10th of following month
-- ============================================================
