
-- 1) mobile_money_payments: split ALL policy into SELECT (patient) + ALL (service_role)
DROP POLICY IF EXISTS "Service role can manage mobile money payments" ON public.mobile_money_payments;
CREATE POLICY "Service role manages mobile money payments"
  ON public.mobile_money_payments
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());
-- existing "Users can view their own mobile money payments" SELECT policy stays

-- 2) user_sessions: remove blanket admin access to raw tokens
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

-- 3) profiles: prevent admin self/other escalation of role/admin_level
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    AND (
      is_super_admin()
      OR (
        role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
        AND admin_level IS NOT DISTINCT FROM (SELECT p.admin_level FROM public.profiles p WHERE p.id = profiles.id)
      )
    )
  );

-- 4) booking_fees: trigger to validate patient-set amount against specialty_booking_fees
CREATE OR REPLACE FUNCTION public.validate_booking_fee_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_specialty text;
  v_expected numeric;
BEGIN
  -- Service role bypasses validation
  IF is_service_role() THEN
    RETURN NEW;
  END IF;

  SELECT p.specialty INTO v_specialty
  FROM public.profiles p
  WHERE p.id = NEW.provider_id;

  IF v_specialty IS NULL THEN
    RAISE EXCEPTION 'Cannot determine provider specialty for booking fee validation';
  END IF;

  SELECT booking_fee INTO v_expected
  FROM public.specialty_booking_fees
  WHERE specialty = v_specialty
    AND is_active = true
  ORDER BY booking_fee ASC
  LIMIT 1;

  IF v_expected IS NULL THEN
    RAISE EXCEPTION 'No active booking fee configured for specialty %', v_specialty;
  END IF;

  -- Force authoritative amount/currency
  NEW.amount := v_expected;
  IF NEW.currency IS NULL THEN
    NEW.currency := 'ZMW';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_booking_fee_amount_trigger ON public.booking_fees;
CREATE TRIGGER validate_booking_fee_amount_trigger
  BEFORE INSERT OR UPDATE OF amount, currency, provider_id ON public.booking_fees
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_fee_amount();

-- 5) promo_code_redemptions: cap discount_applied to configured value
CREATE OR REPLACE FUNCTION public.validate_promo_discount_applied()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_discount numeric;
BEGIN
  IF is_service_role() THEN
    RETURN NEW;
  END IF;

  SELECT discount_value INTO v_max_discount
  FROM public.promo_codes
  WHERE id = NEW.promo_code_id
    AND is_active = true;

  IF v_max_discount IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive promo code';
  END IF;

  IF NEW.discount_applied IS NULL OR NEW.discount_applied > v_max_discount THEN
    NEW.discount_applied := v_max_discount;
  END IF;

  IF NEW.discount_applied < 0 THEN
    NEW.discount_applied := 0;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_promo_discount_applied_trigger ON public.promo_code_redemptions;
CREATE TRIGGER validate_promo_discount_applied_trigger
  BEFORE INSERT OR UPDATE OF discount_applied, promo_code_id ON public.promo_code_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_promo_discount_applied();
