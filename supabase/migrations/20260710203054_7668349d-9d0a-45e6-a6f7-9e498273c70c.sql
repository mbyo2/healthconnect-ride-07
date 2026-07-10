
-- Fix cross-tenant leak: disciplinary_records
DROP POLICY IF EXISTS "Institution admins can manage their disciplinary records" ON public.disciplinary_records;
CREATE POLICY "Institution admins can manage their disciplinary records"
ON public.disciplinary_records
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employee_records er
    JOIN public.healthcare_institutions hi ON hi.id = er.institution_id
    WHERE er.id = disciplinary_records.employee_id
      AND hi.admin_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employee_records er
    JOIN public.healthcare_institutions hi ON hi.id = er.institution_id
    WHERE er.id = disciplinary_records.employee_id
      AND hi.admin_id = auth.uid()
  )
);

-- Fix cross-tenant leak: leave_requests
DROP POLICY IF EXISTS "Institution admins can manage their leave requests" ON public.leave_requests;
CREATE POLICY "Institution admins can manage their leave requests"
ON public.leave_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = leave_requests.institution_id
      AND hi.admin_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = leave_requests.institution_id
      AND hi.admin_id = auth.uid()
  )
);

-- Fix user_wallets: prevent self-crediting via INSERT
DROP POLICY IF EXISTS "System can insert wallets" ON public.user_wallets;
CREATE POLICY "Users can create own wallet with zero balance"
ON public.user_wallets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND COALESCE(balance, 0) = 0);

CREATE POLICY "Service role can insert wallets"
ON public.user_wallets
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix user_subscriptions: restrict INSERT to service_role (payment must be verified server-side)
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role can insert subscriptions"
ON public.user_subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix self-refund abuse: restrict process_refund_atomic to admin or provider only.
-- Patients must submit a refund request via a separate workflow reviewed by provider/admin.
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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  SELECT (admin_level IN ('admin','superadmin')) INTO v_is_admin
    FROM public.profiles WHERE id = p_requester;
  v_is_admin := COALESCE(v_is_admin, false);

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

  v_fully := (p_amount + v_already_refunded) >= v_payment.amount;
  IF v_fully THEN
    UPDATE public.payments SET status = 'refunded', updated_at = now() WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'refund_id', v_refund_id, 'fully_refunded', v_fully);
END;
$function$;
