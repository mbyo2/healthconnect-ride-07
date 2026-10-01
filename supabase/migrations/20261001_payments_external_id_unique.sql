-- Add unique constraint on payments.external_payment_id for atomic idempotency
--
-- The settle.ts shared helper uses external_payment_id (gateway-side unique id)
-- for its idempotency guard, but the check-then-insert pattern is not atomic.
-- Without a unique constraint, two concurrent verifications of the same gateway
-- payment could both pass the SELECT check and create duplicate payment rows.
--
-- Data quality verified 2026-10-01: 7 payments, 0 NULLs, 0 duplicates.
-- Safe to add the constraint.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payments_external_payment_id'
    AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT uq_payments_external_payment_id
      UNIQUE (external_payment_id);
  END IF;
END $$;
