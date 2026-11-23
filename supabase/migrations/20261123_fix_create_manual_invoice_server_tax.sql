-- Fix (swarm patient E2E 2026-11-23): create_manual_invoice trusted the
-- client-sent p_tax verbatim (proven live: subtotal 200 + p_tax 9999
-- persisted as tax 9999, total 10199). House rule: tax resolves
-- server-side via resolve_item_tax_rate, never from the client.
-- p_tax is kept in the signature for caller compatibility but IGNORED;
-- tax is derived per line from the price-list row's tax template.
CREATE OR REPLACE FUNCTION public.create_manual_invoice(p_institution_id uuid, p_patient_id uuid, p_patient_name text, p_lines jsonb, p_tax numeric DEFAULT 0, p_discount numeric DEFAULT 0, p_due_date date DEFAULT NULL::date, p_notes text DEFAULT NULL::text, p_insurance_provider text DEFAULT NULL::text)
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
  v_tax numeric := 0;
  v_line_tax numeric := 0;
  v_total numeric := 0;
  v_items_out jsonb := '[]'::jsonb;
  v_invoice public.billing_invoices%ROWTYPE;
BEGIN
  IF v_caller IS NULL AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Please sign in to create an invoice.' USING ERRCODE = '42501';
  END IF;
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
    -- Server-side tax: per-line rate from the item's tax template /
    -- facility default via resolve_item_tax_rate. p_tax is ignored.
    v_line_tax := round(v_line_total * public.resolve_item_tax_rate(p_institution_id, v_pricing.tax_template_id, 0), 2);
    v_tax := v_tax + v_line_tax;
    v_subtotal := v_subtotal + v_line_total;
    v_items_out := v_items_out || jsonb_build_object(
      'service_pricing_id', v_pricing.id,
      'service_code', v_pricing.service_code,
      'description', v_pricing.service_label,
      'quantity', v_qty,
      'unit_price', v_pricing.base_price,
      'total', v_line_total,
      'tax', v_line_tax
    );
  END LOOP;
  IF COALESCE(p_discount, 0) > v_subtotal THEN
    RAISE EXCEPTION 'Discount cannot be more than the invoice subtotal.';
  END IF;
  v_total := v_subtotal + v_tax - COALESCE(p_discount, 0);
  INSERT INTO public.billing_invoices (
    institution_id, patient_id, invoice_number, patient_name, items,
    subtotal, tax, discount, total_amount, paid_amount, balance,
    status, due_date, notes, insurance_provider, created_by
  ) VALUES (
    p_institution_id, p_patient_id, 'TEMP', p_patient_name, v_items_out,
    v_subtotal, v_tax, COALESCE(p_discount, 0), v_total,
    0, v_total, 'draft', p_due_date, p_notes, p_insurance_provider, v_caller
  )
  RETURNING * INTO v_invoice;
  RETURN to_jsonb(v_invoice);
END;
$function$;
