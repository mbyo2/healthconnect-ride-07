-- Phase 0 pharmacy GAP-04: atomic marketplace order fulfillment.
--
-- order_items is readable only by the patient owner / service role, so the
-- pharmacy-side "Fulfill" action runs through this SECURITY DEFINER function:
-- it resolves every order line to a medication_inventory item, pre-checks
-- dispensable (approved, unexpired) batch stock for ALL lines, then dispenses
-- FEFO per line inside a single transaction. Any shortfall or unresolvable
-- line RAISES before any dispense — no partial fulfillment.
--
-- Depends only on objects that already exist in production
-- (orders, order_items, marketplace_products, medication_inventory,
--  medicine_batches, dispense_medicine_batches, is_pharmacy_operator).
-- Apply together with 20260929_phase0_pharmacy_security.sql.

CREATE OR REPLACE FUNCTION public.fulfill_marketplace_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order     RECORD;
  v_line      RECORD;
  v_item_id   UUID;
  v_item_name TEXT;
  v_matches   INTEGER;
  v_avail     INTEGER;
  v_count     INTEGER := 0;
  v_result    JSONB := '[]'::jsonb;
BEGIN
  SELECT id, pharmacy_id, status
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.pharmacy_id IS NULL THEN
    RAISE EXCEPTION 'Order has no pharmacy assigned';
  END IF;
  IF NOT public.is_pharmacy_operator(v_order.pharmacy_id) THEN
    RAISE EXCEPTION 'Not authorized to fulfill orders for this pharmacy';
  END IF;
  IF v_order.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Order is already % — cannot fulfill', v_order.status;
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed', 'preparing') THEN
    RAISE EXCEPTION 'Order status "%" cannot be fulfilled yet', v_order.status;
  END IF;

  -- Pass 1: resolve every line and pre-check dispensable stock (no writes).
  CREATE TEMP TABLE tmp_fulfill_lines (
    item_id      UUID,
    quantity     INTEGER,
    product_name TEXT
  ) ON COMMIT DROP;

  FOR v_line IN
    SELECT oi.quantity, mp.medication_name
      FROM public.order_items AS oi
      JOIN public.marketplace_products AS mp ON mp.id = oi.product_id
     WHERE oi.order_id = p_order_id
  LOOP
    -- Resolve the marketplace product to the pharmacy's medication_inventory.
    SELECT count(*), max(mi.id), max(mi.medication_name)
      INTO v_matches, v_item_id, v_item_name
      FROM public.medication_inventory AS mi
     WHERE mi.institution_id = v_order.pharmacy_id
       AND mi.medication_name ILIKE '%' || v_line.medication_name || '%';
    IF v_matches = 0 THEN
      RAISE EXCEPTION
        'Product "%" is not in pharmacy inventory — add it before fulfilling',
        v_line.medication_name;
    ELSIF v_matches > 1 THEN
      RAISE EXCEPTION
        'Product "%" matches % inventory items — resolve the ambiguity before fulfilling',
        v_line.medication_name, v_matches;
    END IF;

    SELECT COALESCE(sum(quantity_remaining), 0)
      INTO v_avail
      FROM public.medicine_batches
     WHERE institution_id = v_order.pharmacy_id
       AND inventory_table = 'medication_inventory'
       AND inventory_item_id = v_item_id
       AND is_active
       AND qa_status = 'approved'
       AND expiry_date >= CURRENT_DATE
       AND quantity_remaining > 0;
    IF v_avail < v_line.quantity THEN
      RAISE EXCEPTION
        'Insufficient dispensable stock for "%": need %, have % approved, unexpired units. Order not fulfilled.',
        v_line.medication_name, v_line.quantity, v_avail;
    END IF;

    INSERT INTO tmp_fulfill_lines (item_id, quantity, product_name)
    VALUES (v_item_id, v_line.quantity, v_line.medication_name);
  END LOOP;

  -- Pass 2: FEFO-dispense every line (atomic within this transaction).
  FOR v_line IN SELECT * FROM tmp_fulfill_lines LOOP
    PERFORM public.dispense_medicine_batches(
      v_order.pharmacy_id,
      'medication_inventory',
      v_line.item_id,
      v_line.quantity,
      'marketplace_order',
      p_order_id,
      'Marketplace order fulfillment — ' || v_line.product_name
    );
    v_count := v_count + 1;
    v_result := v_result || jsonb_build_object(
      'product', v_line.product_name,
      'quantity', v_line.quantity
    );
  END LOOP;

  UPDATE public.orders
     SET status = 'preparing',
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'lines', v_count,
    'items', v_result
  );
END;
$$;
