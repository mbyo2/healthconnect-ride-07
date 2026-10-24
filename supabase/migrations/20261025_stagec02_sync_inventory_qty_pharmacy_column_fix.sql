-- Corrective drift migration — live function was hot-fixed to write
-- pharmacy_inventory.quantity (the real column) but the repo migration
-- (20261007_sync_inventory_qty_from_batches.sql) still wrote
-- quantity_available; this aligns the repo with verified live behaviour;
-- no behavioural change.
--
-- Re-running the old repo file on a fresh project would break pharmacy
-- batch sync (42703: pharmacy_inventory has no quantity_available
-- column). The body below is functionally identical to the verified
-- live definition of public.sync_inventory_quantity_from_batches():
-- the pharmacy_inventory branch sets `quantity = v_total`, the
-- medication_inventory branch sets `quantity_available = v_total`.
--
-- Definition-only: the trg_sync_inventory_qty trigger is unchanged and
-- is NOT recreated here, and the historical backfill from the 20261007
-- file is NOT repeated.

CREATE OR REPLACE FUNCTION public.sync_inventory_quantity_from_batches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_item_id uuid;
  v_table text;
  v_total integer;
BEGIN
  v_item_id := COALESCE(NEW.inventory_item_id, OLD.inventory_item_id);
  v_table := COALESCE(NEW.inventory_table, OLD.inventory_table);

  IF v_item_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(quantity_remaining), 0)::integer INTO v_total
  FROM public.medicine_batches
  WHERE inventory_item_id = v_item_id
    AND COALESCE(is_active, true) = true;

  IF v_table = 'pharmacy_inventory' THEN
    UPDATE public.pharmacy_inventory
    SET quantity = v_total,
        updated_at = now()
    WHERE id = v_item_id;
  ELSE
    UPDATE public.medication_inventory
    SET quantity_available = v_total,
        updated_at = now()
    WHERE id = v_item_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
