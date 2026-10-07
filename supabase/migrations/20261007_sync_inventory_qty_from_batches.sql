-- Sync medication_inventory.quantity_available with FEFO batch ledger
--
-- BUG (found 2026-10-07 via live pharmacist dispense test): filling a
-- prescription correctly deducts medicine_batches.quantity_remaining via the
-- batch movement trigger, but medication_inventory.quantity_available is
-- never updated. The UI displays quantity_available, so stock appears
-- unchanged after dispensing (100 shown, 90 actually remaining).
--
-- FIX: AFTER INSERT/UPDATE trigger on medicine_batches that keeps the
-- parent inventory row's quantity_available equal to the sum of active
-- batch quantities. Handles both medication_inventory and pharmacy_inventory
-- via the batch's inventory_table discriminator.

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
    SET quantity_available = v_total,
        updated_at = now()
    WHERE id = v_item_id;
  ELSE
    -- default: medication_inventory (also covers legacy NULL table values)
    UPDATE public.medication_inventory
    SET quantity_available = v_total,
        updated_at = now()
    WHERE id = v_item_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_inventory_qty ON public.medicine_batches;
CREATE TRIGGER trg_sync_inventory_qty
AFTER INSERT OR UPDATE OF quantity_remaining ON public.medicine_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_quantity_from_batches();

COMMENT ON FUNCTION public.sync_inventory_quantity_from_batches() IS
  'Keeps inventory quantity_available in sync with the sum of active FEFO batch quantities. Fixes stock display going stale after dispensing.';

-- Backfill: reconcile all existing inventory rows with their batch sums
UPDATE public.medication_inventory mi
SET quantity_available = COALESCE((
  SELECT SUM(mb.quantity_remaining)
  FROM public.medicine_batches mb
  WHERE mb.inventory_item_id = mi.id
    AND COALESCE(mb.is_active, true) = true
), mi.quantity_available),
updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM public.medicine_batches mb
  WHERE mb.inventory_item_id = mi.id
);
