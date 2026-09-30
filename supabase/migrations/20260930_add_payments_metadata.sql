-- Add metadata JSONB column to public.payments for service_code storage
-- Live payments.service_id is UUID (drifted from repo TEXT); service codes are stored in metadata
-- Idempotent: safe to run multiple times

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.payments
      ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
