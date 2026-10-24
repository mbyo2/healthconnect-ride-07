-- Fix 4: pharmacy batch sync column fix
-- Live sync_inventory_quantity_from_batches() updated pharmacy_inventory
-- SET quantity_available = v_total, but pharmacy_inventory has NO
-- quantity_available column (its stock column is `quantity`);
-- medication_inventory's IS quantity_available. Any medicine_batches insert
-- for a pharmacy_inventory item therefore errored and batch creation was
-- broken for pharmacies. Only the pharmacy branch changes to
-- SET quantity = v_total (keeping updated_at = now()); everything else
-- is byte-identical to the live definition.
CREATE OR REPLACE FUNCTION public.sync_inventory_quantity_from_batches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
