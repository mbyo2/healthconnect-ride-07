-- P1-26 (Stage B audit D-07 / E-14 / E-16): client-computed totals were
-- written straight into financial ledgers. POS sales (pos_sales /
-- pos_sale_items via PharmacyPOS) and manual invoices (billing_invoices
-- via Billing.tsx / useBillingModule) accepted whatever prices and
-- totals the browser sent.
--
-- Fix shape (per audit): compute totals server-side from priced line
-- items through an RPC, and make the tables read-only to clients for
-- creation — the same discipline as resolve_payment_amount (C2a P2-34)
-- and the marketplace order triggers. There is NO client-amount
-- fallback anywhere in this migration.
--
-- Pricing rules implemented:
--  * POS: every line is priced from medication_inventory.unit_price of
--    the SELLING institution at sale time. A line with no catalogue id
--    (the old free-text "custom item") is refused — a typed price has
--    no server anchor (audit E-16 offered server pricing OR a
--    manager-PIN override with audit; no PIN infrastructure exists in
--    the product, so server pricing is the rule). An item with no set
--    price fails closed instead of selling at 0.
--  * POS discount: the till's offered bands are 0/5/10/15 percent; the
--    RPC accepts a percentage in that range and computes the amount.
--  * Manual invoices: every line is priced from service_pricing
--    (the institution's own rows, or platform rows with
--    institution_id IS NULL) and the lines ADD UP (CEO billing rule:
--    every service priced individually, prices add up). Free-text
--    priced lines are refused — the charge must exist on the price
--    list first, which is also the CEO pricing model (institutions
--    add custom services WITH pricing). Tax and discount stay
--    explicit invoice-level amounts (bounded, never hidden inside a
--    client total); the total is computed here.
--  * Institution scoping: a cashier prices only from their own
--    institution's catalogue; invoice creation keeps the exact gate
--    the old INSERT policy used (institution admin / platform admin
--    scope / institution finance staff).

-- ── POS: server-priced sale ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_pos_sale(
  p_pharmacy_id uuid,
  p_items jsonb,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_payment_reference text DEFAULT NULL,
  p_discount_percent numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cashier uuid := auth.uid();
  v_line jsonb;
  v_item_id uuid;
  v_qty integer;
  v_inv record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount_amount numeric := 0;
  v_total numeric := 0;
  v_receipt text;
  v_sale public.pos_sales%ROWTYPE;
  v_items_out jsonb := '[]'::jsonb;
  v_reserved jsonb := '{}'::jsonb;
  v_needed integer;
BEGIN
  IF v_cashier IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to record a sale.' USING ERRCODE = '42501';
  END IF;

  -- Same family of actors the old INSERT policy allowed, tightened to
  -- this institution: its staff, its admin, or a platform admin.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_staff_member(p_pharmacy_id)
     AND NOT public.is_institution_admin(p_pharmacy_id)
     AND NOT public.has_role(v_cashier, 'admin'::app_role)
     AND NOT public.has_role(v_cashier, 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only staff of this pharmacy can record a sale here.' USING ERRCODE = '42501';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the sale.';
  END IF;

  IF p_discount_percent IS NULL OR p_discount_percent < 0 OR p_discount_percent > 15 THEN
    RAISE EXCEPTION 'Discount must be from 0 to 15 percent.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'mobile_money', 'card', 'insurance') THEN
    RAISE EXCEPTION 'Choose a payment method the till supports.';
  END IF;

  -- Price every line from the catalogue BEFORE writing anything.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_line ->> 'medication_inventory_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_item_id := (v_line ->> 'medication_inventory_id')::uuid;
    ELSE
      v_item_id := NULL;
    END IF;
    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Every item on a sale must come from the dispensary price list. Add the item to inventory first, then sell it.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each item needs a quantity of at least 1.';
    END IF;

    SELECT * INTO v_inv
    FROM public.medication_inventory
    WHERE id = v_item_id AND institution_id = p_pharmacy_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That item is not on this pharmacy''s price list.';
    END IF;
    IF v_inv.unit_price IS NULL THEN
      RAISE EXCEPTION 'The item "%" has no set price yet. Ask a manager to set its price in inventory first.', v_inv.medication_name;
    END IF;
    -- Duplicate lines for one item reserve cumulatively: the stock
    -- deduction trigger only fires later, at item insert.
    v_needed := COALESCE((v_reserved ->> v_item_id::text)::integer, 0) + v_qty;
    IF v_inv.quantity_available < v_needed THEN
      RAISE EXCEPTION 'Not enough stock for "%": % available.', v_inv.medication_name, v_inv.quantity_available;
    END IF;
    v_reserved := jsonb_set(v_reserved, ARRAY[v_item_id::text], to_jsonb(v_needed));

    v_line_total := round(v_qty * v_inv.unit_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'medication_inventory_id', v_inv.id,
      'item_name', btrim(v_inv.medication_name || ' ' || COALESCE(v_inv.dosage, '')),
      'quantity', v_qty,
      'unit_price', v_inv.unit_price,
      'discount', 0,
      'total', v_line_total,
      'batch_number', v_inv.batch_number
    );
  END LOOP;

  v_discount_amount := round(v_subtotal * p_discount_percent / 100, 2);
  v_total := v_subtotal - v_discount_amount;
  v_receipt := public.generate_receipt_number(p_pharmacy_id);

  INSERT INTO public.pos_sales (
    pharmacy_id, cashier_id, customer_name, customer_phone, sale_type,
    subtotal, tax_amount, discount_amount, total_amount,
    payment_method, payment_reference, receipt_number, status
  ) VALUES (
    p_pharmacy_id, v_cashier, p_customer_name, p_customer_phone, 'walk_in',
    v_subtotal, 0, v_discount_amount, v_total,
    p_payment_method, p_payment_reference, v_receipt, 'completed'
  )
  RETURNING * INTO v_sale;

  -- Item inserts fire pos_sale_item_deduct_inventory (quantity_available)
  -- and each line is FEFO-dispensed against the batch ledger in the
  -- same transaction — the exact pair of effects the old client flow
  -- performed non-atomically. Any failure rolls the whole sale back.
  FOR v_line IN SELECT * FROM jsonb_array_elements(v_items_out)
  LOOP
    INSERT INTO public.pos_sale_items (
      sale_id, medication_inventory_id, item_name, quantity,
      unit_price, discount, total, batch_number
    ) VALUES (
      v_sale.id,
      (v_line ->> 'medication_inventory_id')::uuid,
      v_line ->> 'item_name',
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'unit_price')::numeric,
      0,
      (v_line ->> 'total')::numeric,
      v_line ->> 'batch_number'
    );

    PERFORM public.dispense_medicine_batches(
      p_pharmacy_id,
      'medication_inventory',
      (v_line ->> 'medication_inventory_id')::uuid,
      (v_line ->> 'quantity')::integer,
      'pos_sale',
      v_sale.id,
      'POS sale ' || v_receipt
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sale', to_jsonb(v_sale),
    'items', v_items_out
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pos_sale(uuid, jsonb, text, text, text, text, numeric) TO authenticated, service_role;

-- ── Manual invoices: server-priced lines ────────────────────────────
CREATE OR REPLACE FUNCTION public.create_manual_invoice(
  p_institution_id uuid,
  p_patient_id uuid,
  p_patient_name text,
  p_lines jsonb,
  p_tax numeric DEFAULT 0,
  p_discount numeric DEFAULT 0,
  p_due_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_insurance_provider text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_line jsonb;
  v_service_id uuid;
  v_qty integer;
  v_pricing record;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_items_out jsonb := '[]'::jsonb;
  v_invoice public.billing_invoices%ROWTYPE;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to create an invoice.' USING ERRCODE = '42501';
  END IF;

  -- The exact gate the old INSERT policy used.
  IF NOT public.is_service_role()
     AND NOT public.is_institution_admin(p_institution_id)
     AND NOT public.has_admin_scope(v_caller)
     AND NOT public.is_institution_finance_staff(p_institution_id) THEN
    RAISE EXCEPTION 'Only this institution''s billing team can create invoices here.' USING ERRCODE = '42501';
  END IF;

  IF p_patient_name IS NULL OR btrim(p_patient_name) = '' THEN
    RAISE EXCEPTION 'Choose the patient this invoice is for.';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Add at least one priced service to the invoice.';
  END IF;

  IF COALESCE(p_tax, 0) < 0 THEN
    RAISE EXCEPTION 'Tax cannot be negative.';
  END IF;
  IF COALESCE(p_discount, 0) < 0 THEN
    RAISE EXCEPTION 'Discount cannot be negative.';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF (v_line ->> 'service_pricing_id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_service_id := (v_line ->> 'service_pricing_id')::uuid;
    ELSE
      v_service_id := NULL;
    END IF;
    IF v_service_id IS NULL THEN
      RAISE EXCEPTION 'Every invoice line must be a priced service from the price list. Add the service and its price first, then add it to the invoice.';
    END IF;
    v_qty := COALESCE((v_line ->> 'quantity')::integer, 0);
    IF v_qty < 1 THEN
      RAISE EXCEPTION 'Each service needs a quantity of at least 1.';
    END IF;

    SELECT * INTO v_pricing
    FROM public.service_pricing
    WHERE id = v_service_id
      AND is_active = true
      AND (institution_id = p_institution_id OR institution_id IS NULL);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That service is not on this institution''s price list.';
    END IF;

    v_line_total := round(v_qty * v_pricing.base_price, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'service_pricing_id', v_pricing.id,
      'service_code', v_pricing.service_code,
      'description', v_pricing.service_label,
      'quantity', v_qty,
      'unit_price', v_pricing.base_price,
      'total', v_line_total
    );
  END LOOP;

  IF COALESCE(p_discount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'Discount cannot be more than the invoice subtotal.';
  END IF;

  v_total := v_subtotal + COALESCE(p_tax, 0) - COALESCE(p_discount, 0);

  INSERT INTO public.billing_invoices (
    institution_id, patient_id, invoice_number, patient_name, items,
    subtotal, tax, discount, total_amount, paid_amount, balance,
    status, due_date, notes, insurance_provider, created_by
  ) VALUES (
    p_institution_id, p_patient_id, 'TEMP', p_patient_name, v_items_out,
    v_subtotal, COALESCE(p_tax, 0), COALESCE(p_discount, 0), v_total,
    0, v_total, 'draft', p_due_date, p_notes, p_insurance_provider, v_caller
  )
  RETURNING * INTO v_invoice;

  RETURN to_jsonb(v_invoice);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_manual_invoice(uuid, uuid, text, jsonb, numeric, numeric, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_invoice(uuid, uuid, text, jsonb, numeric, numeric, date, text, text) TO authenticated, service_role;

-- ── Lockdown: creation only through the RPCs ────────────────────────
-- Direct client INSERTs into the ledger tables end here. SELECT and
-- the non-completed-sale UPDATE/DELETE policies are untouched, so a
-- completed POS sale stays immutable for the cashier (P3-2) and
-- invoice payment still flows through billing_payments.
DROP POLICY IF EXISTS "Pharmacy staff can create sales" ON public.pos_sales;
DROP POLICY IF EXISTS "Pharmacy staff can create sale items" ON public.pos_sale_items;
DROP POLICY IF EXISTS "Finance staff can create invoices" ON public.billing_invoices;
