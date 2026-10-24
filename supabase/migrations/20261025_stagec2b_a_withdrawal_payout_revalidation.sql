-- Stage C2b Cluster A — 2026-10-25
--
-- P2-36 RESIDUAL: the C1 reservation trigger
-- (20261025_stagec36_withdrawal_reservation.sql) reserves funds at
-- REQUEST time, but the payout path performed NO balance re-validation
-- at payout time. Payout path established by inspection:
--   * supabase/functions/lenco-process-payout/index.ts (service role):
--     requires status='approved', claims approved -> processing, writes
--     the lenco_payments ledger row, initiates the Lenco transfer.
--   * supabase/functions/_shared/lenco.ts settleTransferByReference
--     (service role): on Lenco success, claims processing -> paid, THEN
--     debits user_wallets — and on a shortfall it debited into a
--     NEGATIVE balance with only a console.error.
--   * WithdrawalAdminQueue.tsx only approves/rejects and calls the edge
--     function; it never marks paid itself.
-- A balance can legitimately change between reservation and payout
-- (another payout settling, a refund debit, a correction), so the
-- reservation alone cannot guarantee cover at payout.
--
-- Fix (DB-level, so EVERY payout path is covered — edge claim,
-- settler claim, or any future/admin path that moves a row into
-- 'processing' or 'paid'):
--   BEFORE UPDATE trigger: when a row ENTERS 'processing' or 'paid'
--   (status actually changes into one of those), re-validate:
--       wallet balance
--         - SUM(other withdrawals for the same provider in
--               'pending'/'approved'/'processing')
--       must cover THIS row's amount,
--   with the provider's wallet row locked FOR UPDATE and a per-provider
--   advisory lock serialising concurrent claims (same pattern as the
--   reservation trigger). If cover is gone, the transition is refused
--   with a clear 23514 error naming the amounts; the row stays in its
--   previous state (approved rows stay approved and retryable once the
--   balance is restored; a processing row is NOT forced to paid).
--   Entering 'paid' is checked identically because settlement debits
--   the wallet only after the paid claim in the current settler.
-- Scope: the trigger fires for authenticated AND service_role callers
-- (the real payout paths) and is skipped only for operator SQL
-- (auth.role() IS NULL — direct database administration), matching the
-- house pattern of the C1 withdrawal triggers. It does not fire on
-- INSERT (creation is the reservation trigger's job, which also forces
-- client rows to 'pending') or on non-payout transitions
-- (pending->approved/rejected/cancelled are decisions, not payouts).

CREATE OR REPLACE FUNCTION public.validate_withdrawal_payout_cover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_other_reserved numeric;
  v_available numeric;
BEGIN
  IF auth.role() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only payout-entry transitions are re-validated.
  IF NEW.status NOT IN ('processing', 'paid') THEN
    RETURN NEW;
  END IF;
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('withdrawal:' || NEW.provider_id::text, 0));

  SELECT w.balance INTO v_balance
  FROM public.user_wallets w
  WHERE w.user_id = NEW.provider_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);

  SELECT COALESCE(SUM(wr.amount), 0) INTO v_other_reserved
  FROM public.withdrawal_requests wr
  WHERE wr.provider_id = NEW.provider_id
    AND wr.id <> NEW.id
    AND wr.status IN ('pending', 'approved', 'processing');

  v_available := v_balance - v_other_reserved;

  IF NEW.amount > v_available THEN
    RAISE EXCEPTION 'Payout refused: wallet balance no longer covers this withdrawal. Balance: K%, reserved by other withdrawals: K%, available: K%, payout requested: K%.',
      v_balance, v_other_reserved, v_available, NEW.amount
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_withdrawal_payout_cover ON public.withdrawal_requests;
CREATE TRIGGER trg_validate_withdrawal_payout_cover
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_withdrawal_payout_cover();

REVOKE EXECUTE ON FUNCTION public.validate_withdrawal_payout_cover() FROM PUBLIC, anon, authenticated;
