-- 20261110_platform_revenue_credit.sql — L-5 (security sweep 2026-11-10).
--
-- PROBLEM: settle.ts credited platform-only revenue (subscriptions, HMS
-- fees, listing fees) to app_owner_wallet with a read-modify-write done
-- in the edge function (SELECT balance, then UPDATE balance = old + amount).
-- Two concurrent settlements could both read the same balance and one
-- credit was lost. The wallet-topup and split paths already route through
-- locking RPCs; the platform-only path did not.
--
-- FIX: a locking RPC (settle_platform_revenue) + a ledger table
-- (app_owner_wallet_credits). The RPC runs in ONE transaction:
--   1. locks the single app_owner_wallet row FOR UPDATE,
--   2. inserts the credit into the ledger (external_ref UNIQUE — a
--      concurrent or retried settlement for the same gateway reference
--      returns already:true instead of double-crediting),
--   3. atomically increments the balance (balance = balance + amount).
--
-- The platform-only path previously left NO ledger trace at all (no
-- payments row — payments.provider_id is NOT NULL with an FK to
-- profiles, and the app owner is not a profile — and no split row).
-- The new table is that trace: every platform credit is now auditable.
--
-- LIVE BASELINE (introspected 2026-11-10 before apply):
--   * app_owner_wallet has exactly 1 row; balance is the live value.
--   * No app_owner_wallet_credits table, no settle_platform_revenue fn.
--   * settle.ts platform-only branch does the read-modify-write.
-- TARGET STATE (verified after apply):
--   * settle_platform_revenue exists, SECURITY DEFINER, search_path
--     pinned, EXECUTE granted to service_role only (revoked from
--     anon/authenticated/PUBLIC — verified via proacl re-read).
--   * app_owner_wallet_credits exists, RLS enabled, no permissive
--     policies (service_role only), grants scoped to service_role.
--   * Rollback-proof test: BEGIN; call RPC twice with the same ref;
--     second call returns already:true; balance moved exactly once;
--     ROLLBACK leaves live state untouched.

-- ============ 1. Ledger table ============
CREATE TABLE IF NOT EXISTS public.app_owner_wallet_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_ref TEXT NOT NULL,
  gateway TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  reference_type TEXT,
  reference_id UUID,
  payer_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_app_owner_wallet_credits_external_ref UNIQUE (external_ref)
);

ALTER TABLE public.app_owner_wallet_credits ENABLE ROW LEVEL SECURITY;

-- Server-only ledger: no policies for anon/authenticated (deny-all),
-- service_role bypasses RLS. Explicit grants, per the Oct-30 rule.
REVOKE ALL ON public.app_owner_wallet_credits FROM PUBLIC;
REVOKE ALL ON public.app_owner_wallet_credits FROM anon, authenticated;
GRANT SELECT, INSERT ON public.app_owner_wallet_credits TO service_role;

-- ============ 2. Locking RPC ============
CREATE OR REPLACE FUNCTION public.settle_platform_revenue(
  p_amount NUMERIC(10,2),
  p_external_ref TEXT,
  p_gateway TEXT,
  p_payer_id UUID,
  p_reference_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT 'ZMW'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC(10,2);
  v_credit_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'invalid_amount');
  END IF;
  IF p_external_ref IS NULL OR btrim(p_external_ref) = '' THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'invalid_external_ref');
  END IF;
  IF p_gateway IS NULL OR btrim(p_gateway) = '' THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'invalid_gateway');
  END IF;

  -- Lock the single app-owner wallet row: concurrent settlements
  -- serialize here, so no credit can be lost to a read-modify-write.
  SELECT id INTO v_wallet_id FROM app_owner_wallet LIMIT 1 FOR UPDATE;
  IF v_wallet_id IS NULL THEN
    RETURN jsonb_build_object('settled', false, 'reason', 'wallet_not_found');
  END IF;

  -- Ledger first: the UNIQUE external_ref is the idempotency key. A
  -- concurrent or retried settlement for the same gateway reference
  -- conflicts here and returns already:true without touching the
  -- balance a second time.
  INSERT INTO app_owner_wallet_credits (
    external_ref, gateway, amount, currency,
    reference_type, reference_id, payer_id, description
  ) VALUES (
    p_external_ref, p_gateway, p_amount, COALESCE(p_currency, 'ZMW'),
    p_reference_type, p_reference_id, p_payer_id, p_description
  )
  ON CONFLICT (external_ref) DO NOTHING
  RETURNING id INTO v_credit_id;

  IF v_credit_id IS NULL THEN
    SELECT balance INTO v_new_balance FROM app_owner_wallet WHERE id = v_wallet_id;
    RETURN jsonb_build_object('settled', true, 'already', true, 'new_balance', v_new_balance);
  END IF;

  -- Atomic increment under the row lock — never a read-modify-write.
  UPDATE app_owner_wallet
  SET balance = balance + p_amount, updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'settled', true, 'already', false,
    'credit_id', v_credit_id, 'new_balance', v_new_balance
  );
END;
$function$;

-- New functions get EXECUTE for PUBLIC by default: strip it. Only the
-- service-role edge functions may call this RPC.
REVOKE EXECUTE ON FUNCTION public.settle_platform_revenue(
  NUMERIC(10,2), TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_platform_revenue(
  NUMERIC(10,2), TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_platform_revenue(
  NUMERIC(10,2), TEXT, TEXT, UUID, TEXT, UUID, TEXT, TEXT
) TO service_role;
