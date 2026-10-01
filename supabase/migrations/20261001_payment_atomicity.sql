-- ============================================================
-- Doc'O Clock — Payment atomicity + race-safe idempotency (2026-10-01)
--
-- Problems:
--   1. Wallet debit (Edge Function) and split/credit (DB function) are
--      separate steps. A crash between them = patient debited, no
--      payment completed.
--   2. Idempotency key lives in metadata JSONB with no unique
--      constraint — two concurrent requests can both pass the check.
--   3. Zero-amount split rows are inserted (e.g. 0% commission).
--
-- Fixes:
--   1. Add payments.idempotency_key with UNIQUE constraint (race-safe).
--   2. New atomic process_full_payment() RPC: idempotency check ->
--      debit patient wallet -> create payment -> splits -> credits,
--      ALL in one transaction. Any failure rolls back everything.
--   3. Skip zero-amount splits.
--
-- The Edge Function should call process_full_payment() instead of
-- doing the debit itself.
--
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── 1. Race-safe idempotency key ───
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payments_idempotency_key'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT uq_payments_idempotency_key
      UNIQUE (idempotency_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON public.payments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── 2. Atomic full payment RPC ───
-- Does EVERYTHING in one transaction:
--   a. Race-safe idempotency check (unique constraint wins ties)
--   b. Debit patient wallet (fails if insufficient balance)
--   c. Create payment row
--   d. Create splits (via existing logic)
--   e. Credit recipient wallets
-- Any error rolls back ALL of it — no partial debits.
CREATE OR REPLACE FUNCTION public.process_full_payment(
  p_patient_id UUID,
  p_provider_id UUID,
  p_total_amount NUMERIC,
  p_payment_type TEXT DEFAULT 'consultation',
  p_institution_id UUID DEFAULT NULL,
  p_service_id TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'wallet',
  p_currency TEXT DEFAULT 'ZMW',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id UUID;
  v_app_commission DECIMAL(5,2);
  v_app_amount NUMERIC(10,2);
  v_payee_amount NUMERIC(10,2);
  v_payee_type TEXT;
  v_payee_id UUID;
  v_existing_id UUID;
BEGIN
  -- ── Idempotency: return existing payment if key was seen ──
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.payments
    WHERE idempotency_key = p_idempotency_key;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'payment_id', v_existing_id
      );
    END IF;
  END IF;

  -- ── Debit patient wallet (row lock prevents double-spend) ──
  UPDATE public.user_wallets
  SET balance = balance - p_total_amount,
      updated_at = now()
  WHERE user_id = p_patient_id
    AND balance >= p_total_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- ── Create payment row (unique constraint enforces idempotency) ──
  INSERT INTO public.payments (
    patient_id, provider_id, service_id, amount, currency,
    status, payment_method, idempotency_key, metadata
  ) VALUES (
    p_patient_id, p_provider_id, p_service_id, p_total_amount, p_currency,
    'completed', p_payment_method, p_idempotency_key,
    jsonb_build_object('payment_type', p_payment_type, 'institution_id', p_institution_id)
  ) RETURNING id INTO v_payment_id;

  -- ── Calculate splits (two-party: platform cut + payee gets rest) ──
  SELECT commission_percentage INTO v_app_commission
  FROM public.commission_settings
  WHERE entity_type = 'app_owner' AND is_active = true;
  v_app_commission := COALESCE(v_app_commission, 0);
  v_app_amount := p_total_amount * (v_app_commission / 100);
  v_payee_amount := p_total_amount - v_app_amount;

  IF p_payment_type = 'pharmacy' AND p_institution_id IS NOT NULL THEN
    v_payee_type := 'pharmacy';
    v_payee_id := p_institution_id;
  ELSIF p_institution_id IS NOT NULL THEN
    v_payee_type := 'institution';
    v_payee_id := p_institution_id;
  ELSE
    v_payee_type := 'health_personnel';
    v_payee_id := p_provider_id;
  END IF;

  -- ── Create splits (skip zero-amount rows) ──
  IF v_app_amount > 0 THEN
    INSERT INTO public.payment_splits (payment_id, recipient_id, recipient_type, amount, percentage, status)
    VALUES (v_payment_id, (SELECT id FROM public.app_owner_wallet LIMIT 1), 'app_owner', v_app_amount, v_app_commission, 'completed');
  END IF;
  IF v_payee_amount > 0 THEN
    INSERT INTO public.payment_splits (payment_id, recipient_id, recipient_type, amount, percentage, status)
    VALUES (v_payment_id, v_payee_id, v_payee_type, v_payee_amount, 100 - v_app_commission, 'completed');
  END IF;

  -- ── Credit recipients ──
  IF v_app_amount > 0 THEN
    UPDATE public.app_owner_wallet SET
      balance = balance + v_app_amount,
      updated_at = now()
    WHERE id = (SELECT id FROM public.app_owner_wallet LIMIT 1);
  END IF;

  IF v_payee_type = 'health_personnel' AND v_payee_amount > 0 THEN
    UPDATE public.user_wallets SET
      balance = balance + v_payee_amount,
      updated_at = now()
    WHERE user_id = p_provider_id;
  ELSIF v_payee_amount > 0 THEN
    INSERT INTO public.institution_wallets (institution_id, balance)
    VALUES (v_payee_id, v_payee_amount)
    ON CONFLICT (institution_id) DO UPDATE SET
      balance = public.institution_wallets.balance + v_payee_amount,
      updated_at = now();
  END IF;

  UPDATE public.payments
  SET completed_at = now(), updated_at = now()
  WHERE id = v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'payment_id', v_payment_id,
    'total', p_total_amount,
    'platform_amount', v_app_amount,
    'payee_amount', v_payee_amount,
    'payee_type', v_payee_type
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent duplicate: unique constraint won, return existing.
    SELECT id INTO v_existing_id
    FROM public.payments
    WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'payment_id', v_existing_id
    );
END;
$$;
