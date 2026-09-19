-- ============================================================================
-- ZMW as the canonical platform currency.
-- All prices, wallets, and ledgers are Zambian Kwacha by default; display
-- in other currencies is a presentation-layer conversion only.
-- Safe to re-run.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_wallets' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.user_wallets ALTER COLUMN currency SET DEFAULT 'ZMW';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'ZMW';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'institution_wallets' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.institution_wallets ALTER COLUMN currency SET DEFAULT 'ZMW';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'app_owner_wallet' AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.app_owner_wallet ALTER COLUMN currency SET DEFAULT 'ZMW';
  END IF;
END $$;
