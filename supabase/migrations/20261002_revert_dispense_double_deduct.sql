-- Revert the 20261002_fix_dispense_deduct_stock change.
--
-- That migration added an explicit UPDATE of medicine_batches inside
-- dispense_medicine_batches, but the BEFORE INSERT trigger
-- trg_apply_batch_movement (apply_batch_movement()) already deducts the
-- batch quantity and corrects quantity_after on every movement insert.
-- The explicit UPDATE caused DOUBLE deduction (100 -> 90 for a 5-unit
-- dispense, proven live 2026-10-02).
--
-- The original function was correct: it inserts the movement with a
-- quantity_after=0 placeholder, and the trigger applies the deduction and
-- overwrites quantity_after with the true remaining quantity. This revert
-- restores that design.

CREATE OR REPLACE FUNCTION public.dispense_medicine_batches(
  p_institution_id   UUID,
  p_inventory_table  TEXT,
  p_inventory_item_id UUID,
  p_quantity         INTEGER,
  p_reference_type   TEXT DEFAULT NULL,
  p_reference_id     UUID DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_batch     RECORD;
  v_take      INTEGER;
  v_alloc     JSONB := '[]'::jsonb;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF p_inventory_table NOT IN ('pharmacy_inventory', 'medication_inventory') THEN
    RAISE EXCEPTION 'Unknown inventory table: %', p_inventory_table;
  END IF;

  FOR v_batch IN
    SELECT id, batch_number, expiry_date, quantity_remaining, unit_cost
      FROM public.medicine_batches
     WHERE institution_id = p_institution_id
       AND inventory_table = p_inventory_table
       AND inventory_item_id = p_inventory_item_id
       AND is_active
       AND qa_status = 'approved'
       AND expiry_date >= CURRENT_DATE
       AND quantity_remaining > 0
     ORDER BY expiry_date ASC, received_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_batch.quantity_remaining, v_remaining);
    -- No explicit UPDATE here: the trg_apply_batch_movement BEFORE INSERT
    -- trigger deducts medicine_batches.quantity_remaining and sets the true
    -- quantity_after on the movement row. An explicit UPDATE here would
    -- double-deduct.
    INSERT INTO public.batch_stock_movements
      (institution_id, batch_id, movement_type, quantity_change, quantity_after,
       unit_cost, reference_type, reference_id, notes)
    VALUES
      (p_institution_id, v_batch.id, 'dispense', -v_take, 0,
       v_batch.unit_cost, p_reference_type, p_reference_id,
       COALESCE(p_notes, 'FEFO dispense'));
    v_alloc := v_alloc || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_number', v_batch.batch_number,
      'expiry_date', v_batch.expiry_date,
      'quantity', v_take,
      'unit_cost', v_batch.unit_cost
    );
    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'Insufficient dispensable stock: short by % units (approved, unexpired batches only)',
      v_remaining;
  END IF;

  RETURN jsonb_build_object('allocated', v_alloc, 'total', p_quantity);
END;
$$;
