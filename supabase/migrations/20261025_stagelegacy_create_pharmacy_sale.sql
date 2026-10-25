-- Legacy pharmacy_sales completion (follow-up to P1-26, 2026-10-25):
-- two routed surfaces still wrote the legacy pharmacy_sales table
-- client-side, and live pharmacy_sales has ONLY a SELECT policy
-- (institution owners) — no INSERT policy at all — so both flows
-- failed 403 at the sale step:
--   * DispensaryOperations (medication_inventory universe) — fixed by
--     routing it through the existing create_pos_sale RPC (client
--     change only, no migration needed for that surface).
--   * PharmacyManagement POS Board (pharmacy_inventory universe) —
--     fixed here with a dedicated server-priced RPC.
--
-- Discipline (P1-26): creation is RPC-only. NO client INSERT policy
-- is added to pharmacy_sales. The client sends pharmacy_inventory
-- ids + quantities + payment method + optional customer id ONLY —
-- there is no price/total channel in the payload, and any price
-- fields a client attaches to a line are ignored here.
--
-- Pricing rules implemented:
--  * Every line is priced from pharmacy_inventory.unit_price OF THE
--    SELLING pharmacy at sale time. An item belonging to another
--    pharmacy is refused. An item with no set price fails closed.
--  * Subtotal is computed server-side as the sum of the priced lines.
--  * Tax is 16% of the subtotal, computed server-side. 16% is the
--    rate the POS Board UI has always displayed openly ("Tax (16%)");
--    it is now a server constant (v_tax_rate below), so the displayed
--    rule and the charged rule are the same rule and neither can be
--    tampered with from the browser.
--  * Total = subtotal + tax, computed server-side.
--  * Stock: each line is FEFO-dispensed via dispense_medicine_batches
--    (inventory_table 'pharmacy_inventory') inside the same
--    transaction — the batch ledger stays the stock truth and
--    pharmacy_inventory.quantity is synced from it by the existing
--    trg_sync_inventory_qty trigger. Any shortfall aborts the whole
--    sale; there is no client delete-rollback anymore.
--  * The sale row is born 'completed' with the server figures.
--    resolve_payment_amount's 'pharmacy_sale' mapping reads
--    pharmacy_sales.total_amount (after pos_sales), so writing the
--    server total there keeps that mapping working unchanged.
--
-- Gate: pharmacy_inventory's live write policies admit
-- is_institution_admin(pharmacy_id) OR
-- is_institution_staff_member(pharmacy_id). This RPC mirrors that
-- write-actor family, tightened to the selling pharmacy, plus
-- platform admins — the same shape create_pos_sale uses.

-- ── pharmacy_inventory universe: server-priced sale ─────────────────
CREATE OR REPLACE FUNCTION public.create_pharmacy_sale(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_payment_method text DEFAULT 'cash',
  p_customer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_tax_rate numeric := 0.16; -- server constant: the UI's displayed Tax (16%)
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_inv record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_txn text;
  v_sale public.pharmacy_sales%ROWTYPE;
  v_items_out jsonb := '[]'::jsonb;
  v_reserved jsonb := '{}'::jsonb;
  v_needed integer;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to record a sale.' USING ERRCODE = '42501';
  END IF;

  -- pharmacy_inventory write-actor family, tightened to this pharmacy.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_staff_member(p_pharmacy_id)
     AND NOT public.is_institution_admin(p_pharmacy_id)
     AND NOT public.has_role(v_caller, 'admin'::app_role)
     AND NOT public.has_role(v_caller, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only staff of this pharmacy can record a sale here.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the sale.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'card', 'mobile_money', 'insurance', 'credit') THEN
    RAISE EXCEPTION 'Choose a payment method the till supports.';
  END IF;

  IF p_customer_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'That customer is not a registered patient.';
  END IF;

  -- Price every line from the selling pharmacy's catalogue BEFORE
  -- writing anything. Only the id + quantity keys are read; any
  -- price/total fields on a line are ignored.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_line ->> 'pharmacy_inventory_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_item_id := (v_line ->> 'pharmacy_inventory_id')::uuid;
    ELSE
      v_item_id := NULL;
    END IF;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Every item on a sale must come from this pharmacy''s catalogue. Add the item to inventory first, then sell it.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each item needs a quantity of at least 1.';
    END IF;

    SELECT * INTO v_inv
    FROM public.pharmacy_inventory
    WHERE id = v_item_id AND pharmacy_id = p_pharmacy_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That item is not on this pharmacy''s catalogue.';
    END IF;
    IF v_inv.unit_price IS NULL THEN
      RAISE EXCEPTION 'The item "%" has no set price yet. Ask a manager to set its price in inventory first.', v_inv.product_name;
    END IF;
    -- Duplicate lines for one item reserve cumulatively: the FEFO
    -- dispense only runs after the sale row is written.
    v_needed := COALESCE((v_reserved ->> v_item_id::text)::integer, 0) + v_qty;
    IF v_inv.quantity < v_needed THEN
      RAISE EXCEPTION 'Not enough stock for "%": % available.', v_inv.product_name, v_inv.quantity;
    END IF;
    v_reserved := jsonb_set(v_reserved, ARRAY[v_item_id::text], to_jsonb(v_needed));

    v_line_total := round(v_qty * v_inv.unit_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'pharmacy_inventory_id', v_inv.id,
      'product_name', v_inv.product_name,
      'quantity', v_qty,
      'unit_price', v_inv.unit_price,
      'total', v_line_total
    );
  END LOOP;

  v_tax := round(v_subtotal * v_tax_rate, 2);
  v_total := v_subtotal + v_tax;
  v_txn := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-'
           || upper(left(replace(gen_random_uuid()::text, '-', ''), 8));

  INSERT INTO public.pharmacy_sales (
    pharmacy_id, transaction_id, customer_id, items,
    subtotal, tax, tax_amount, discount, discount_amount,
    total_amount, paid_amount, balance,
    payment_method, payment_status, served_by, cashier_id
  ) VALUES (
    p_pharmacy_id, v_txn, p_customer_id, v_items_out,
    v_subtotal, v_tax, v_tax, 0, 0,
    v_total, v_total, 0,
    p_payment_method, 'completed', v_caller, v_caller
  )
  RETURNING * INTO v_sale;

  -- FEFO dispense against the batch ledger in the same transaction.
  -- Any shortfall raises and rolls the whole sale back — the client
  -- no longer deletes the sale row to compensate.
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_items_out)
  LOOP
    PERFORM public.dispense_medicine_batches(
      p_pharmacy_id,
      'pharmacy_inventory',
      (v_line ->> 'pharmacy_inventory_id')::uuid,
      (v_line ->> 'quantity')::integer,
      'pharmacy_sale',
      v_sale.id,
      'Pharmacy sale ' || v_txn
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', v_items_out
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_pharmacy_sale(uuid, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pharmacy_sale(uuid, jsonb, text, uuid) TO authenticated, service_role;

-- ── Today's-sales visibility for the selling pharmacy's staff ───────
-- Live pharmacy_sales had exactly ONE policy before this migration:
-- "pharmacy_sales_select" (owner: healthcare_institutions.admin_id =
-- auth.uid()). It is kept untouched. Sellers could not read back the
-- sales they record, so the POS Board's "Today's Sales" panel was
-- always empty for them. Permissive policies OR together, so this
-- SELECT policy only widens reads to the selling pharmacy's own
-- staff / institution admin / platform admin — the same actor family
-- that can create sales here. No INSERT/UPDATE/DELETE policy is added:
-- creation stays RPC-only.
CREATE POLICY "Pharmacy staff can view pharmacy sales" ON public.pharmacy_sales
  FOR SELECT TO authenticated
  USING (
    public.is_institution_staff_member(pharmacy_id)
    OR public.is_institution_admin(pharmacy_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );
