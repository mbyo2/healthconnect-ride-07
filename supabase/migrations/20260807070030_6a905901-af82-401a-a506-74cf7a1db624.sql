-- Two-party payment split: platform fee + single payee (provider / pharmacy / institution)
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(
  p_payment_id uuid,
  p_total_amount numeric,
  p_provider_id uuid,
  p_institution_id uuid DEFAULT NULL::uuid,
  p_payment_type text DEFAULT 'consultation'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_platform_entity TEXT;
  v_platform_pct DECIMAL(5,2);
  v_platform_amount DECIMAL(10,2);
  v_payee_amount DECIMAL(10,2);
  v_payee_type TEXT;
  v_payee_id UUID;
BEGIN
  -- Platform (app owner) fee source: pharmacy sales use the pharmacy commission
  -- rate, everything else uses the app_owner rate. No other party takes a cut.
  v_platform_entity := CASE WHEN p_payment_type = 'pharmacy' THEN 'pharmacy' ELSE 'app_owner' END;

  SELECT commission_percentage INTO v_platform_pct
  FROM commission_settings
  WHERE entity_type = v_platform_entity AND is_active = true
  LIMIT 1;

  v_platform_pct := COALESCE(v_platform_pct, 0);
  v_platform_amount := ROUND(p_total_amount * (v_platform_pct / 100), 2);
  v_payee_amount := p_total_amount - v_platform_amount;

  -- Single payee: the institution when the service is billed by a facility,
  -- otherwise the provider / pharmacy owner.
  IF p_institution_id IS NOT NULL THEN
    v_payee_type := 'institution';
    v_payee_id := p_institution_id;
  ELSE
    v_payee_type := CASE WHEN p_payment_type = 'pharmacy' THEN 'pharmacy' ELSE 'health_personnel' END;
    v_payee_id := p_provider_id;
  END IF;

  INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage)
  VALUES
    (p_payment_id, (SELECT id FROM app_owner_wallet LIMIT 1), 'app_owner', v_platform_amount, v_platform_pct),
    (p_payment_id, v_payee_id, v_payee_type, v_payee_amount, 100 - v_platform_pct);

  UPDATE app_owner_wallet
  SET balance = balance + v_platform_amount, updated_at = now();

  IF v_payee_type = 'institution' THEN
    INSERT INTO institution_wallets (institution_id, balance)
    VALUES (v_payee_id, v_payee_amount)
    ON CONFLICT (institution_id)
    DO UPDATE SET balance = institution_wallets.balance + v_payee_amount, updated_at = now();
  ELSE
    UPDATE user_wallets
    SET balance = balance + v_payee_amount, updated_at = now()
    WHERE user_id = v_payee_id;
  END IF;

  UPDATE payment_splits
  SET status = 'completed', processed_at = now()
  WHERE payment_id = p_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'platform_fee', v_platform_amount,
    'platform_percentage', v_platform_pct,
    'payee_type', v_payee_type,
    'payee_id', v_payee_id,
    'payee_amount', v_payee_amount
  );
END;
$function$;

-- Older 4-arg overload delegates to the new logic
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(
  p_payment_id uuid,
  p_total_amount numeric,
  p_provider_id uuid,
  p_institution_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.process_payment_with_splits(p_payment_id, p_total_amount, p_provider_id, p_institution_id, 'consultation');
$function$;

-- Pricing model: patients pay no platform fee; providers pay per-new-patient
-- booking fees instead of a revenue share. Pharmacy sales keep the 2.5% cut.
UPDATE commission_settings SET commission_percentage = 0, updated_at = now()
WHERE entity_type = 'app_owner';
UPDATE commission_settings SET commission_percentage = 100, updated_at = now()
WHERE entity_type = 'health_personnel';
UPDATE commission_settings SET is_active = false, updated_at = now()
WHERE entity_type = 'institution';