-- Stage C2a / Cluster A — P2-34
-- resolve_payment_amount had no branch for the live payment types
-- 'pharmacy_sale' and 'subscription', so it returned NULL (fails closed in
-- the price guard, but the types could never be paid through the guarded
-- path — and the dangerous "fix" would have been trusting a client amount).
--
-- This adds SERVER-SIDE branches only, derived from authoritative rows:
--   pharmacy_sale -> pos_sales.total_amount, then pharmacy_sales.total_amount,
--                    then orders.total_amount. The orders fallback exists
--                    because the live caller (PharmacyPayment.tsx via
--                    lenco-create-payment) passes an ORDER id with reference
--                    type 'pharmacy_sale' (verified in src + lenco-create's
--                    own institution resolver, which treats it the same way).
--   subscription  -> user_subscriptions joined to subscription_plans, priced
--                    by the subscription's own billing_cycle (price_annual
--                    for annual cycles, price_monthly otherwise). The live
--                    caller (PricingPage.tsx) passes a user_subscriptions id.
--                    Fallback: a bare subscription_plans id resolves to its
--                    monthly price. Inactive plans do not resolve.
-- Unknown types and unknown ids still return NULL (fail closed). No
-- client-supplied amount is ever accepted — this function takes only a
-- reference type + id, exactly as before.
--
-- CREATE OR REPLACE preserves the live ACL ({postgres, service_role});
-- verified after apply. search_path stays pinned to 'public'.

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
      SELECT total_amount INTO v_amount FROM public.billing_invoices WHERE id = _reference_id;
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
