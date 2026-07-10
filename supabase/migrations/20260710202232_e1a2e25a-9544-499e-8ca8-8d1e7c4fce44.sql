
-- 1) Harden process_wallet_transaction: enforce caller == owner (or service_role)
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
  p_user_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_description text DEFAULT NULL::text,
  p_payment_id uuid DEFAULT NULL::uuid
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

  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

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
    description, payment_id, created_by
  )
  VALUES (
    v_wallet_id, p_transaction_type, p_amount, v_new_balance,
    p_description, p_payment_id, p_user_id
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

-- Belt-and-braces: revoke EXECUTE from authenticated so it's only reachable via service_role
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_wallet_transaction(uuid, text, numeric, text, uuid) TO service_role;

-- 2) Restrict patient UPDATE on comprehensive_medical_records to self-reported records only
DROP POLICY IF EXISTS "Patients can update their own medical records" ON public.comprehensive_medical_records;

CREATE POLICY "Patients can update only their self-reported records"
ON public.comprehensive_medical_records
FOR UPDATE
TO authenticated
USING (
  auth.uid() = patient_id
  AND COALESCE(record_source, 'patient') = 'patient'
)
WITH CHECK (
  auth.uid() = patient_id
  AND COALESCE(record_source, 'patient') = 'patient'
);
