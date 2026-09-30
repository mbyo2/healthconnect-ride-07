-- ============================================================
-- Doc'O Clock — Payment splits idempotency + atomicity (2026-09-30)
--
-- Problems:
--   1. process_payment_with_splits() is not idempotent. If called twice
--      with the same payment_id (retry after failure), it creates duplicate
--      splits and double-credits wallets.
--   2. No unique constraint prevents duplicate splits.
--   3. The Edge Function debits the wallet BEFORE creating splits. If
--      splits fail, the debit is not rolled back (only payment-row
--      creation failure has a rollback).
--
-- Fixes:
--   1. Add UNIQUE(payment_id, recipient_type) to prevent duplicates.
--   2. Make the function idempotent: return early if splits exist.
--   3. Edge Function: add idempotency key check + rollback on splits
--      failure (see supabase/functions/process-payment-with-splits/index.ts).
--
-- Note: The commission PERCENTAGES (15% app_owner, etc.) are business
-- policy and are NOT changed here. The math already sums to exactly
-- p_total_amount (payee gets total minus platform cut).
--
-- Idempotent; safe to re-run.
-- ============================================================

-- 1. Prevent duplicate splits at the database level.
-- One split per (payment, recipient_type). A payment has at most one
-- app_owner split, one health_personnel/institution/pharmacy split.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payment_splits_payment_recipient'
  ) THEN
    ALTER TABLE public.payment_splits
      ADD CONSTRAINT uq_payment_splits_payment_recipient
      UNIQUE (payment_id, recipient_type);
  END IF;
END $$;

-- 2. Make process_payment_with_splits idempotent.
-- If splits already exist for this payment, return them instead of
-- creating duplicates. This makes retries safe.
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(
  p_payment_id uuid,
  p_total_amount numeric,
  p_provider_id uuid,
  p_institution_id uuid DEFAULT NULL,
  p_payment_type text DEFAULT 'consultation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app_commission DECIMAL(5,2);
  v_app_amount DECIMAL(10,2);
  v_institution_amount DECIMAL(10,2);
  v_personnel_amount DECIMAL(10,2);
  v_pharmacy_amount DECIMAL(10,2);
  v_existing JSONB;
BEGIN
  -- IDEMPOTENCY: If splits already exist, return them (no duplicates).
  IF EXISTS (SELECT 1 FROM payment_splits WHERE payment_id = p_payment_id) THEN
    SELECT jsonb_build_object(
      'success', true,
      'already_processed', true,
      'payment_id', p_payment_id,
      'splits', jsonb_agg(
        jsonb_build_object(
          'recipient_type', recipient_type,
          'amount', amount,
          'percentage', percentage,
          'status', status
        )
      )
    ) INTO v_existing
    FROM payment_splits
    WHERE payment_id = p_payment_id;

    RETURN v_existing;
  END IF;

  -- Get platform commission (COALESCE handles inactive/missing).
  SELECT commission_percentage INTO v_app_commission
  FROM commission_settings
  WHERE entity_type = 'app_owner' AND is_active = true;
  v_app_commission := COALESCE(v_app_commission, 0);

  -- Two-party split: platform takes its cut, payee gets the rest.
  -- Sums to exactly p_total_amount.
  v_app_amount := p_total_amount * (v_app_commission / 100);

  IF p_payment_type = 'pharmacy' THEN
    v_pharmacy_amount := p_total_amount - v_app_amount;
    v_personnel_amount := 0;
    v_institution_amount := 0;
  ELSIF p_institution_id IS NOT NULL THEN
    v_institution_amount := p_total_amount - v_app_amount;
    v_personnel_amount := 0;
    v_pharmacy_amount := 0;
  ELSE
    v_personnel_amount := p_total_amount - v_app_amount;
    v_institution_amount := 0;
    v_pharmacy_amount := 0;
  END IF;

  -- Create payment splits (unique constraint prevents duplicates).
  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES (p_payment_id, (SELECT id FROM app_owner_wallet LIMIT 1), 'app_owner', v_app_amount, v_app_commission);

  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES (p_payment_id, p_provider_id, 'health_personnel', v_personnel_amount, 100 - v_app_commission);

  IF p_institution_id IS NOT NULL AND p_payment_type != 'pharmacy' THEN
    INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
    VALUES (p_payment_id, p_institution_id, 'institution', v_institution_amount, 100 - v_app_commission);
  END IF;

  IF p_payment_type = 'pharmacy' AND p_institution_id IS NOT NULL THEN
    INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
    VALUES (p_payment_id, p_institution_id, 'pharmacy', v_pharmacy_amount, 100 - v_app_commission);
  END IF;

  -- Credit wallets (atomic with splits — all in one transaction).
  UPDATE app_owner_wallet SET
    balance = balance + v_app_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM app_owner_wallet LIMIT 1);

  UPDATE user_wallets SET
    balance = balance + v_personnel_amount,
    updated_at = now()
  WHERE user_id = p_provider_id;

  IF p_institution_id IS NOT NULL AND (v_institution_amount > 0 OR v_pharmacy_amount > 0) THEN
    INSERT INTO institution_wallets (institution_id, balance)
    VALUES (p_institution_id, COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0))
    ON CONFLICT (institution_id)
    DO UPDATE SET
      balance = institution_wallets.balance + COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0),
      updated_at = now();
  END IF;

  -- Mark splits as completed.
  UPDATE payment_splits
  SET status = 'completed', processed_at = now()
  WHERE payment_id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'app_amount', v_app_amount,
    'institution_amount', v_institution_amount,
    'personnel_amount', v_personnel_amount,
    'pharmacy_amount', v_pharmacy_amount,
    'payment_type', p_payment_type
  );
END;
$function$;
