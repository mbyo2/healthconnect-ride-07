-- 1) Trusted price resolution helpers ---------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_service_price(_service_id text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_uuid uuid;
BEGIN
  IF _service_id IS NULL OR length(trim(_service_id)) = 0 THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_uuid := _service_id::uuid;
  EXCEPTION WHEN others THEN
    v_uuid := NULL;
  END;

  IF v_uuid IS NOT NULL THEN
    SELECT price INTO v_price FROM public.healthcare_services WHERE id = v_uuid;
    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  SELECT base_price INTO v_price
  FROM public.service_pricing
  WHERE service_code = _service_id AND is_active = true
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN v_price;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_payment_amount(_reference_type text, _reference_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    ELSE
      v_amount := NULL;
  END CASE;

  RETURN v_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_service_price(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_payment_amount(text, uuid) TO authenticated, service_role;

-- 2) Order item price integrity ---------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_active boolean;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  SELECT price, is_active INTO v_price, v_active
  FROM public.marketplace_products
  WHERE id = NEW.product_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Unknown product';
  END IF;
  IF coalesce(v_active, false) = false THEN
    RAISE EXCEPTION 'Product is not available';
  END IF;

  -- Always use the catalogue price; ignore any client-supplied value
  NEW.unit_price := v_price;
  NEW.total_price := v_price * NEW.quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_item_price ON public.order_items;
CREATE TRIGGER trg_enforce_order_item_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_price();

CREATE OR REPLACE FUNCTION public.recalculate_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := COALESCE(NEW.order_id, OLD.order_id);
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_total
  FROM public.order_items WHERE order_id = v_order_id;

  UPDATE public.orders SET total_amount = v_total, updated_at = now()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_order_total ON public.order_items;
CREATE TRIGGER trg_recalculate_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_total();

-- Clients may not set/alter order totals directly
CREATE OR REPLACE FUNCTION public.enforce_order_total_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_amount := 0;
  ELSIF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    NEW.total_amount := OLD.total_amount;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_total_integrity ON public.orders;
CREATE TRIGGER trg_enforce_order_total_integrity
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_total_integrity();

-- 3) Session token exposure --------------------------------------------------

REVOKE SELECT ON public.user_sessions FROM authenticated;
REVOKE SELECT ON public.user_sessions FROM anon;
GRANT SELECT (id, user_id, expires_at, last_activity, ip_address, user_agent, is_active, created_at, location, device_info)
  ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

-- 4) Mobile money payment records are immutable to clients -------------------

REVOKE INSERT, UPDATE, DELETE ON public.mobile_money_payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.mobile_money_payments FROM anon;
GRANT SELECT ON public.mobile_money_payments TO authenticated;
GRANT ALL ON public.mobile_money_payments TO service_role;

DROP POLICY IF EXISTS "Service role manages mobile money payments" ON public.mobile_money_payments;
CREATE POLICY "Service role manages mobile money payments"
ON public.mobile_money_payments FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());