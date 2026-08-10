-- ============================================================
-- Migration: Multi-Country HRMS & General Ledger Accounting System
-- Date: 2026-08-10
-- Purpose:
--   1. chart_of_accounts: Customizable double-entry ledger accounts
--   2. journal_entries: General ledger debit/credit postings
--   3. country_statutory_configs: Multi-country tax, VAT, PAYE & currency laws
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
  type            TEXT           NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
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
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(type);


-- -----------------------------------------------------------
-- 2. GENERAL LEDGER JOURNAL ENTRIES
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID           REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  entry_number    TEXT           NOT NULL,
  date            DATE           NOT NULL DEFAULT CURRENT_DATE,
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
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);


-- -----------------------------------------------------------
-- 3. COUNTRY STATUTORY & TAX CONFIGURATION
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.country_statutory_configs (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID          REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  country_code     TEXT          NOT NULL DEFAULT 'ZM',
  country_name     TEXT          NOT NULL DEFAULT 'Zambia',
  currency         TEXT          NOT NULL DEFAULT 'ZMW',
  vat_rate         DECIMAL(5,2)  DEFAULT 16.00,
  paye_tax_rate    DECIMAL(5,2)  DEFAULT 25.00,
  pension_rate     DECIMAL(5,2)  DEFAULT 5.00,
  health_levy_rate DECIMAL(5,2)  DEFAULT 1.00,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_statutory_config_per_inst UNIQUE (institution_id)
);

ALTER TABLE public.country_statutory_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users access country statutory configs" ON public.country_statutory_configs;
CREATE POLICY "Authenticated users access country statutory configs"
  ON public.country_statutory_configs FOR ALL TO authenticated USING (true);

-- ============================================================
-- SUMMARY:
-- ✅ chart_of_accounts: Double-entry accounts with Asset/Liability/Equity/Revenue/Expense
-- ✅ journal_entries: General ledger audit postings
-- ✅ country_statutory_configs: Multi-country VAT, PAYE, Pension & Currency laws
-- ============================================================
