-- Fix wallet top-up double-credit race (found 2026-10-04 during concurrency review).
--
-- Defect: supabase/functions/_shared/settle.ts credits wallet top-ups via a
-- check-then-act on wallet_transactions.description (ilike match on an embedded
-- ref tag). Two concurrent settlements for the same gateway reference both see
-- "no prior credit" and both credit — double-crediting the wallet. The code
-- comment admitted "a unique DB constraint on the reference is the complete fix"
-- but it was never implemented. wallet_transactions had zero unique constraints.
--
-- Fix:
-- 1. Add wallet_transactions.gateway_ref (nullable TEXT) with a partial unique
--    index — the idempotency key for gateway-driven credits.
-- 2. process_wallet_transaction accepts p_gateway_ref and stores it; a 23505
--    on the unique index means a concurrent settlement already credited —
--    callers treat that as idempotent success (same pattern as payments).
-- 3. Lock the wallet row (FOR UPDATE) before read-modify-write so concurrent
--    credits/debits cannot lost-update the balance.
--
-- Idempotent; safe to re-run.

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS gateway_ref TEXT;

DROP INDEX IF EXISTS public.uq_wallet_transactions_gateway_ref;
CREATE UNIQUE INDEX uq_wallet_transactions_gateway_ref
  ON public.wallet_transactions (gateway_ref)
  WHERE gateway_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_description text DEFAULT NULL::text,
  p_payment_id uuid DEFAULT NULL::uuid,
  p_gateway_ref text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
  v_transaction_id UUID;
BEGIN
  -- Authorization: only the wallet owner or the service role may invoke this.
  IF NOT public.is_service_role() AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
    RAISE EXCEPTION 'Forbidden: cannot modify another user''s wallet';
  END IF;

  -- Credits (top-ups) must go through service_role only (edge functions),
  -- so signed-in users cannot self-credit even their own wallet.
  IF p_transaction_type = 'credit' AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Forbidden: wallet credits must be processed server-side';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  -- Lock the wallet row so concurrent credits/debits serialize instead of
  -- lost-updating the balance via read-modify-write.
  SELECT id, balance INTO v_wallet_id, v_current_balance
    FROM user_wallets
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user';
  END IF;

  IF p_transaction_type = 'debit' THEN
    v_new_balance := v_current_balance - p_amount;
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient funds. Current balance: %, Required: %', v_current_balance, p_amount;
    END IF;
  ELSIF p_transaction_type = 'credit' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  UPDATE user_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (
    wallet_id, transaction_type, amount, balance_after,
    description, payment_id, created_by, gateway_ref
  )
  VALUES (
    v_wallet_id, p_transaction_type, p_amount, v_new_balance,
    p_description, p_payment_id, p_user_id, p_gateway_ref
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'previous_balance', v_current_balance
  );
END;
$function$;

-- Keep the original 5-arg signature working (defaults cover the new param).
-- Belt-and-braces: revoke EXECUTE from authenticated so it's only reachable via service_role
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid, text) FROM anon;
