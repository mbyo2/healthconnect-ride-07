-- Stage C1 (Worker C) — 2026-10-25
--
-- P2-36: withdrawal_requests had NO fund reservation. A provider could
-- stack pending requests that each fit inside their wallet balance but
-- together exceeded it many times over, and every one of them could be
-- approved and paid against the same money.
--
-- Creation path (established by inspection):
--   * Client: src/components/wallet/WithdrawalRequests.tsx inserts
--     DIRECTLY into public.withdrawal_requests via PostgREST. There is
--     no creation RPC and no creation edge function. The only balance
--     check was client-side (`amt > walletBalance` against the raw
--     user_wallets.balance, ignoring other pending requests).
--   * Balance source of truth: public.user_wallets.balance
--     (user_id = provider). Wallet.tsx reads exactly this for the UI,
--     and the payout settler debits exactly this row.
--   * LIVE DRIFT found while establishing the path: only the SELECT
--     policy ("Providers view own withdrawals") exists live. The
--     INSERT / UPDATE policies from the repo migration
--     20261010_withdrawal_requests.sql were never applied (or were
--     dropped), so the documented self-service flow could not insert
--     at all through PostgREST. The policies are restored below,
--     faithful to 20261010, so the flow works AND is reserved.
--   * The live table also has no decided_by / decided_at / paid_at
--     columns and no CHECK constraints (the 20261010 DDL exists only
--     in the repo). The admin queue (WithdrawalAdminQueue.decide)
--     writes decided_by / decided_at and the payout function requires
--     them, so admin decisions currently fail live with a missing-
--     column error. That schema drift is DOCUMENTED here, not fixed:
--     it belongs to the payout flow, which this item does not rebuild.
--
-- Payout path audit (checklist 6e) — residual, deliberately not fixed:
--   * supabase/functions/lenco-process-payout requires status
--     'approved' + decided_by set, claims approved -> processing, and
--     initiates the Lenco transfer. It NEVER re-reads user_wallets:
--     there is no balance re-validation at payout time.
--   * supabase/functions/_shared/lenco.ts settleTransferByReference
--     debits the wallet only AFTER Lenco reports success, and on a
--     shortfall it debits into a negative balance with only a
--     console.error ("the money has LEFT with Lenco"). With the
--     creation-time reservation below, a shortfall can now only arise
--     if the balance is reduced by a non-withdrawal path between
--     request and payout; closing that last gap needs a payout-time
--     re-check (or debit-at-approval) in the payout flow itself.
--
-- Reservation design (this migration):
--   * BEFORE INSERT trigger for JWT client callers (direct SQL and
--     service_role untouched, house pattern):
--       - status is forced to 'pending' (no born-approved / born-paid
--         requests through the client path);
--       - amount must be > 0 (the live table lost the 20261010 CHECK);
--       - a per-provider advisory transaction lock serialises
--         concurrent requests, the provider's user_wallets row is
--         locked FOR UPDATE, and the insert is refused unless
--         amount + SUM(existing 'pending'/'approved'/'processing')
--         <= wallet balance. 'processing' counts because the payout
--         function moves approved rows there before money leaves;
--         'paid' does not count because settlement has already
--         debited the wallet; 'rejected'/'cancelled' never reserve.
--   * BEFORE UPDATE guard: provider_id and amount are immutable for
--     every client caller, so an approved request cannot be inflated
--     between approval and payout (the reservation would be void).
--     Admin decisions (status / admin_note) and the provider cancel
--     flow are unaffected — they touch neither column.
--   * Currency note: settlement is always ZMW (Wallet.tsx) and
--     user_wallets is the single ZMW balance; the check is therefore
--     made against that one balance regardless of the requested
--     currency label, exactly as the payout settler debits it.

-- ---------------------------------------------------------------------
-- Restore the 20261010 policies that are missing live
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Providers request withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Providers request withdrawals"
  ON public.withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id AND status = 'pending');

DROP POLICY IF EXISTS "Providers cancel own pending withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Providers cancel own pending withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id AND status = 'pending')
  WITH CHECK (auth.uid() = provider_id AND status = 'cancelled');

DROP POLICY IF EXISTS "Admins view all withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Admins view all withdrawals"
  ON public.withdrawal_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin', 'admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Admins decide withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Admins decide withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin', 'admin', 'finance_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin', 'admin', 'finance_manager')
    )
  );

-- ---------------------------------------------------------------------
-- P2-36: atomic reservation on creation
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_reserved numeric;
BEGIN
  IF auth.role() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Requests are born pending; approval is an admin decision.
  NEW.status := 'pending';

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero.'
      USING ERRCODE = '23514';
  END IF;

  -- Serialise concurrent requests from the same provider, then lock
  -- the balance row so the check and the insert are atomic.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('withdrawal:' || NEW.provider_id::text, 0));

  SELECT w.balance INTO v_balance
  FROM public.user_wallets w
  WHERE w.user_id = NEW.provider_id
  FOR UPDATE;

  v_balance := COALESCE(v_balance, 0);

  SELECT COALESCE(SUM(wr.amount), 0) INTO v_reserved
  FROM public.withdrawal_requests wr
  WHERE wr.provider_id = NEW.provider_id
    AND wr.status IN ('pending', 'approved', 'processing');

  IF NEW.amount + v_reserved > v_balance THEN
    RAISE EXCEPTION 'This withdrawal would exceed your available balance. Balance: K%, already requested and awaiting payout: K%.',
      v_balance, v_reserved
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_reservation ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_reservation
  BEFORE INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_withdrawal_reservation();

-- ---------------------------------------------------------------------
-- UPDATE guard: the reserved amount and its owner cannot change
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_withdrawal_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.amount IS DISTINCT FROM OLD.amount THEN
    RAISE EXCEPTION 'A withdrawal''s provider and amount cannot be changed after it is requested.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_withdrawal_update_columns ON public.withdrawal_requests;
CREATE TRIGGER trg_guard_withdrawal_update_columns
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_withdrawal_update_columns();
