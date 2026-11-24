-- Payments audit fixes (CEO report 2026-11-24: "payments aren't all working").
-- Live-verified defects addressed on the DB side:
--   1. resolve_payment_amount('invoice') returned the FULL invoice total, so a
--      part-paid invoice could never be settled through a gateway (the client
--      sends the outstanding balance; the price guard rejected it). It now
--      returns the outstanding balance.
--   2. user_subscriptions had NO insert policy for authenticated users (only
--      service_role), so the subscribe flow failed with 42501 for everyone.
--      Users may now create their own pending/trialing subscriptions (or an
--      active one for a genuinely free plan). The update policy no longer lets
--      a user flip their own subscription to 'active' — activation happens
--      server-side when the payment settles (see settle.ts).
--   3. Refunds were record-only: process_refund_atomic wrote a 'completed'
--      refund row and flipped the payment status but no money ever moved —
--      the payee kept the split and the patient got nothing back. Refunds now
--      reverse the payment's splits (capped at what each wallet still holds,
--      shortfall recorded) and credit the patient's wallet. The same reversal
--      runs for gateway/wallet payments linked to a refunded billing invoice.
-- Idempotent: safe to re-run.

-- ── 1. Invoice price resolution = outstanding balance ────────────────────
CREATE OR REPLACE FUNCTION public.resolve_payment_amount(_reference_type text, _reference_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_amount numeric;
BEGIN
  IF _reference_id IS NULL THEN
    RETURN NULL;
  END IF;

  CASE lower(coalesce(_reference_type, ''))
    WHEN 'order' THEN
      SELECT total_amount INTO v_amount FROM public.orders WHERE id = _reference_id;
    WHEN 'booking_fee' THEN
      SELECT amount INTO v_amount FROM public.booking_fees WHERE id = _reference_id;
    WHEN 'healthcare_service' THEN
      SELECT price INTO v_amount FROM public.healthcare_services WHERE id = _reference_id;
    WHEN 'service_pricing' THEN
      SELECT base_price INTO v_amount FROM public.service_pricing WHERE id = _reference_id AND is_active = true;
    WHEN 'invoice' THEN
      -- Outstanding balance, not the invoice total: a part-paid invoice must
      -- be settleable for what is still owed (payments-audit fix 2026-11-24).
      SELECT GREATEST(total_amount - COALESCE(paid_amount, 0), 0) INTO v_amount
      FROM public.billing_invoices WHERE id = _reference_id;
    WHEN 'consultation' THEN
      SELECT sp.base_price INTO v_amount
      FROM public.video_consultations vc
      JOIN public.service_pricing sp
        ON sp.service_code = vc.service_code
       AND sp.institution_id IS NULL
       AND sp.is_active = true
      WHERE vc.id = _reference_id;
    WHEN 'pharmacy_sale' THEN
      SELECT total_amount INTO v_amount FROM public.pos_sales WHERE id = _reference_id;
      IF v_amount IS NULL THEN
        SELECT total_amount INTO v_amount FROM public.pharmacy_sales WHERE id = _reference_id;
      END IF;
      IF v_amount IS NULL THEN
        SELECT total_amount INTO v_amount FROM public.orders WHERE id = _reference_id;
      END IF;
    WHEN 'subscription' THEN
      SELECT CASE
               WHEN lower(coalesce(us.billing_cycle, '')) IN ('annual', 'yearly', 'annually')
                 THEN sp.price_annual
               ELSE sp.price_monthly
             END INTO v_amount
      FROM public.user_subscriptions us
      JOIN public.subscription_plans sp
        ON sp.id = us.plan_id
       AND sp.is_active = true
      WHERE us.id = _reference_id;
      IF v_amount IS NULL THEN
        SELECT price_monthly INTO v_amount
        FROM public.subscription_plans
        WHERE id = _reference_id AND is_active = true;
      END IF;
    ELSE
      v_amount := NULL;
  END CASE;

  RETURN v_amount;
END;
$function$;

-- ── 2. Subscription RLS: create own pending/trialing; no self-activation ──
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can create own subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      status IN ('pending', 'trialing')
      OR (
        status = 'active'
        AND EXISTS (
          SELECT 1 FROM public.subscription_plans p
          WHERE p.id = plan_id
            AND p.is_active
            AND COALESCE(p.price_monthly, 0) = 0
            AND COALESCE(p.price_annual, 0) = 0
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (status <> 'active' OR public.has_admin_scope(auth.uid()))
  );

-- ── 3. Refund money reversal ──────────────────────────────────────────────
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Reverse a payment's completed splits for a refund of p_refund_amount:
-- each recipient is debited its proportional share, capped at the balance
-- it still holds (any gap is reported as shortfall, never silently
-- invented), and the patient is credited the total actually reversed with
-- a 'refund' wallet-ledger row. SECURITY DEFINER, service-only: it is
-- called from process_refund_atomic / refund_billing_invoice, never
-- directly by clients.
CREATE OR REPLACE FUNCTION public.reverse_payment_splits(p_payment_id uuid, p_refund_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_total_shares numeric := 0;
  v_diff numeric := 0;
  v_reversed numeric := 0;
  v_breakdown jsonb := '[]'::jsonb;
  r record;
  v_share numeric;
  v_actual numeric;
  v_wallet_id uuid;
  v_balance numeric;
BEGIN
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF v_payment.id IS NULL OR COALESCE(v_payment.amount, 0) <= 0
     OR p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
    RETURN jsonb_build_object('reversed_total', 0, 'shortfall', COALESCE(p_refund_amount, 0),
                              'breakdown', '[]'::jsonb, 'reason', 'invalid_input');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_splits
                 WHERE payment_id = p_payment_id AND status = 'completed') THEN
    RETURN jsonb_build_object('reversed_total', 0, 'shortfall', p_refund_amount,
                              'breakdown', '[]'::jsonb, 'reason', 'no_completed_splits');
  END IF;

  SELECT COALESCE(SUM(round(amount * p_refund_amount / v_payment.amount, 2)), 0)
    INTO v_total_shares
    FROM public.payment_splits
    WHERE payment_id = p_payment_id AND status = 'completed';
  v_diff := p_refund_amount - v_total_shares;

  FOR r IN
    SELECT id, recipient_id, recipient_type, amount,
           round(amount * p_refund_amount / v_payment.amount, 2) AS share,
           row_number() OVER (ORDER BY amount DESC) AS rn
      FROM public.payment_splits
     WHERE payment_id = p_payment_id AND status = 'completed'
     ORDER BY amount DESC
  LOOP
    v_share := r.share + CASE WHEN r.rn = 1 THEN v_diff ELSE 0 END;
    v_actual := 0;
    IF v_share > 0 THEN
      IF r.recipient_type = 'app_owner' THEN
        SELECT balance INTO v_balance FROM public.app_owner_wallet
          WHERE id = r.recipient_id FOR UPDATE;
        IF FOUND THEN
          v_actual := LEAST(v_share, v_balance);
          UPDATE public.app_owner_wallet
             SET balance = balance - v_actual, updated_at = now()
           WHERE id = r.recipient_id;
        END IF;
      ELSIF r.recipient_type = 'health_personnel' THEN
        SELECT id, balance INTO v_wallet_id, v_balance FROM public.user_wallets
          WHERE user_id = r.recipient_id FOR UPDATE;
        IF FOUND THEN
          v_actual := LEAST(v_share, v_balance);
          UPDATE public.user_wallets
             SET balance = balance - v_actual, updated_at = now()
           WHERE id = v_wallet_id;
        END IF;
      ELSIF r.recipient_type IN ('institution', 'pharmacy') THEN
        SELECT id, balance INTO v_wallet_id, v_balance FROM public.institution_wallets
          WHERE institution_id = r.recipient_id FOR UPDATE;
        IF FOUND THEN
          v_actual := LEAST(v_share, v_balance);
          UPDATE public.institution_wallets
             SET balance = balance - v_actual, updated_at = now()
           WHERE id = v_wallet_id;
        END IF;
      END IF;
    END IF;
    v_reversed := v_reversed + v_actual;
    v_breakdown := v_breakdown || jsonb_build_object(
      'recipient_type', r.recipient_type, 'recipient_id', r.recipient_id,
      'share', v_share, 'reversed', v_actual);
  END LOOP;

  -- Credit the patient what was actually recovered, with a visible
  -- 'refund' entry in their wallet history.
  IF v_reversed > 0 THEN
    SELECT id, balance INTO v_wallet_id, v_balance FROM public.user_wallets
      WHERE user_id = v_payment.patient_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.user_wallets (user_id, balance, currency)
      VALUES (v_payment.patient_id, 0, 'ZMW')
      RETURNING id, balance INTO v_wallet_id, v_balance;
    END IF;
    UPDATE public.user_wallets
       SET balance = balance + v_reversed, updated_at = now()
     WHERE id = v_wallet_id;
    INSERT INTO public.wallet_transactions
      (wallet_id, transaction_type, amount, balance_after, description, payment_id, created_by, gateway_ref)
    VALUES
      (v_wallet_id, 'refund', v_reversed, v_balance + v_reversed,
       'Refund for payment ' || p_payment_id::text, p_payment_id, v_payment.patient_id, NULL);
  END IF;

  RETURN jsonb_build_object(
    'reversed_total', v_reversed,
    'shortfall', p_refund_amount - v_reversed,
    'breakdown', v_breakdown);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reverse_payment_splits(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment_splits(uuid, numeric) TO service_role;

-- process_refund_atomic: same guards as before, but the refund now moves
-- the money (split reversal + patient credit) instead of only recording it.
CREATE OR REPLACE FUNCTION public.process_refund_atomic(p_payment_id uuid, p_amount numeric, p_reason text, p_requester uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment payments%ROWTYPE;
  v_already_refunded numeric;
  v_is_admin boolean;
  v_fully boolean;
  v_refund_id uuid;
  v_rev jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND p_requester IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'A refund requester must act as themselves.' USING ERRCODE = '42501'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  v_is_admin := public.has_role(p_requester, 'admin') OR public.has_role(p_requester, 'super_admin');

  -- Only admins or the provider on the payment can approve a refund.
  -- Patients cannot self-refund; they must request via a reviewed workflow.
  IF NOT v_is_admin
     AND v_payment.provider_id IS DISTINCT FROM p_requester THEN
    RAISE EXCEPTION 'Forbidden: refunds require provider or admin approval';
  END IF;

  IF v_payment.status <> 'completed' THEN
    RAISE EXCEPTION 'Payment is not eligible for refund';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_already_refunded
    FROM public.refunds
    WHERE payment_id = p_payment_id
      AND (status IS NULL OR status NOT IN ('failed','cancelled'));

  IF v_already_refunded >= v_payment.amount THEN
    RAISE EXCEPTION 'Payment has already been fully refunded';
  END IF;
  IF (p_amount + v_already_refunded) > v_payment.amount THEN
    RAISE EXCEPTION 'Refund amount exceeds remaining refundable balance';
  END IF;

  INSERT INTO public.refunds (payment_id, amount, reason, status)
  VALUES (p_payment_id, p_amount, p_reason, 'completed')
  RETURNING id INTO v_refund_id;

  -- Move the money back: reverse this payment's splits proportionally and
  -- credit the patient. A shortfall (a payee already withdrew the funds)
  -- downgrades the refund to 'partial' with the breakdown in metadata —
  -- never claim a full refund that did not fully happen.
  v_rev := public.reverse_payment_splits(p_payment_id, p_amount);
  UPDATE public.refunds
     SET status = CASE WHEN COALESCE((v_rev->>'shortfall')::numeric, 0) > 0 THEN 'partial' ELSE 'completed' END,
         metadata = v_rev,
         updated_at = now()
   WHERE id = v_refund_id;

  v_fully := (p_amount + v_already_refunded) >= v_payment.amount;
  IF v_fully THEN
    UPDATE public.payments SET status = 'refunded', updated_at = now() WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'refund_id', v_refund_id, 'fully_refunded', v_fully,
                            'reversed_total', v_rev->>'reversed_total', 'reversal_shortfall', v_rev->>'shortfall');
END;
$function$;

-- refund_billing_invoice: same guards and status flip as before (the ZRA
-- credit-note trigger fires off the status change, unchanged), plus the
-- internal money reversal for any gateway/wallet payment settled against
-- the invoice. Cash-recorded payments never entered platform wallets, so
-- there is nothing internal to reverse for them.
CREATE OR REPLACE FUNCTION public.refund_billing_invoice(p_invoice_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_invoice public.billing_invoices;
  v_pay public.payments%ROWTYPE;
  v_refund_id uuid;
  v_rev jsonb;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to refund an invoice.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice FROM public.billing_invoices
  WHERE id = p_invoice_id FOR UPDATE;
  IF v_invoice.id IS NULL THEN
    RAISE EXCEPTION 'That invoice could not be found.';
  END IF;

  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(v_invoice.institution_id)
     AND NOT public.has_admin_scope(v_caller)
     AND NOT public.is_institution_finance_staff(v_invoice.institution_id) THEN
    RAISE EXCEPTION 'Only this institution''s billing team can refund an invoice.'
      USING ERRCODE = '42501';
  END IF;

  IF v_invoice.status = 'refunded' THEN
    RAISE EXCEPTION 'This invoice has already been refunded.';
  END IF;
  IF v_invoice.status NOT IN ('paid', 'partial') THEN
    RAISE EXCEPTION 'Only an invoice that has been paid can be refunded.';
  END IF;

  UPDATE public.billing_invoices
  SET status = 'refunded',
      notes = CASE
        WHEN p_reason IS NULL OR btrim(p_reason) = '' THEN notes
        ELSE COALESCE(notes || E'\n', '') || 'Refund: ' || btrim(p_reason)
      END,
      updated_at = now()
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  FOR v_pay IN
    SELECT * FROM public.payments
     WHERE metadata->>'reference_type' = 'invoice'
       AND metadata->>'reference_id' = p_invoice_id::text
       AND status = 'completed'
  LOOP
    INSERT INTO public.refunds (payment_id, amount, reason, status)
    VALUES (v_pay.id, v_pay.amount, COALESCE(p_reason, 'Invoice refund'), 'completed')
    RETURNING id INTO v_refund_id;

    v_rev := public.reverse_payment_splits(v_pay.id, v_pay.amount);
    UPDATE public.refunds
       SET status = CASE WHEN COALESCE((v_rev->>'shortfall')::numeric, 0) > 0 THEN 'partial' ELSE 'completed' END,
           metadata = v_rev,
           updated_at = now()
     WHERE id = v_refund_id;

    UPDATE public.payments SET status = 'refunded', updated_at = now() WHERE id = v_pay.id;
  END LOOP;

  RETURN to_jsonb(v_invoice);
END;
$function$;
