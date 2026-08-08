
-- 1. user_subscriptions: pin privileged columns on self-update
CREATE OR REPLACE FUNCTION public.prevent_subscription_self_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_service_role()
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.plan_id := OLD.plan_id;
  NEW.status := OLD.status;
  NEW.billing_cycle := OLD.billing_cycle;
  NEW.current_period_start := OLD.current_period_start;
  NEW.current_period_end := OLD.current_period_end;
  NEW.trial_start := OLD.trial_start;
  NEW.trial_end := OLD.trial_end;
  NEW.promo_code_id := OLD.promo_code_id;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_subscription_self_upgrade_trigger ON public.user_subscriptions;
CREATE TRIGGER prevent_subscription_self_upgrade_trigger
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.prevent_subscription_self_upgrade();

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. referral_links: block self-inflation of counters
CREATE OR REPLACE FUNCTION public.prevent_referral_counter_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_referrals := 0;
    NEW.total_conversions := 0;
  ELSE
    NEW.total_referrals := OLD.total_referrals;
    NEW.total_conversions := OLD.total_conversions;
    NEW.referrer_id := OLD.referrer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_referral_counter_tampering_trigger ON public.referral_links;
CREATE TRIGGER prevent_referral_counter_tampering_trigger
BEFORE INSERT OR UPDATE ON public.referral_links
FOR EACH ROW EXECUTE FUNCTION public.prevent_referral_counter_tampering();

-- 3. promo_code_redemptions: force referral reward fields server-side
CREATE OR REPLACE FUNCTION public.validate_promo_discount_applied()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Referral reward state is system-owned; never trust client input
  NEW.referral_spend_met := false;
  NEW.referral_reward_paid := false;

  RETURN NEW;
END;
$$;

-- 4. Lock down SECURITY DEFINER functions exposed to anon / non-server callers
REVOKE EXECUTE ON FUNCTION public.has_care_relationship(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_payment_amount(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_service_price(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_refund_atomic(uuid, numeric, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_staff_invitation_by_token(text) FROM anon;
