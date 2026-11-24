-- Swarm 2026-11-24 — hospital inventory build (Order 1).
-- Findings: audit-inventory.md. hospital_inventory existed as a register with
-- list/add UI only: no ledger, no movement RPC/UI, free-text locations, no
-- integrity guard, and the erp_inventory module was unreachable. This migration
-- adds the DB half, mirroring the proven apply_drug_stock_movement pattern.

-- INV-6: departments/wards as real stock locations (hospital_departments is the
-- live per-institution department table).
ALTER TABLE public.hospital_inventory
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.hospital_departments(id);

-- INV-9: quantities can never go negative at the DB level.
ALTER TABLE public.hospital_inventory
  ADD CONSTRAINT hospital_inventory_quantity_nonneg CHECK (quantity_available >= 0);

-- INV-1: the movement ledger. Append-only for clients: rows are written by the
-- SECURITY DEFINER RPC below; authenticated users get SELECT only.
CREATE TABLE IF NOT EXISTS public.hospital_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id),
  item_id uuid NOT NULL REFERENCES public.hospital_inventory(id),
  movement_type text NOT NULL CHECK (movement_type IN
    ('received','issued','transferred','adjusted','expired','damaged','written_off')),
  quantity integer NOT NULL,
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  from_department_id uuid REFERENCES public.hospital_departments(id),
  to_department_id uuid REFERENCES public.hospital_departments(id),
  reason text,
  reference text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hospital_inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff can view inventory movements" ON public.hospital_inventory_movements;
CREATE POLICY "Institution staff can view inventory movements" ON public.hospital_inventory_movements
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id));

GRANT SELECT ON public.hospital_inventory_movements TO authenticated;
GRANT ALL ON public.hospital_inventory_movements TO service_role;

-- INV-2: the movement RPC. Row-locks the item, gates on institution staff/admin,
-- refuses over-issue, and writes the before/after ledger row — the same shape as
-- apply_drug_stock_movement. 'adjusted' takes a SIGNED delta (stocktake
-- corrections both ways); 'transferred' relocates the item to another department
-- of the same institution without changing quantity.
CREATE OR REPLACE FUNCTION public.apply_hospital_stock_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text DEFAULT NULL,
  p_to_department_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_item record;
  v_new_qty integer;
  v_from_dept uuid;
  v_movement_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_item FROM public.hospital_inventory WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Hospital inventory item not found'; END IF;

  IF NOT (public.is_institution_staff_member(v_item.institution_id)
          OR public.is_institution_admin(v_item.institution_id)) THEN
    RAISE EXCEPTION 'Not permitted for this facility';
  END IF;

  IF p_movement_type NOT IN ('received','issued','transferred','adjusted','expired','damaged','written_off') THEN
    RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
  END IF;

  v_from_dept := v_item.department_id;

  IF p_movement_type = 'transferred' THEN
    IF p_to_department_id IS NULL THEN RAISE EXCEPTION 'Choose the department to transfer to'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.hospital_departments
                   WHERE id = p_to_department_id AND hospital_id = v_item.institution_id) THEN
      RAISE EXCEPTION 'That department does not belong to this facility';
    END IF;
    v_new_qty := v_item.quantity_available;
    UPDATE public.hospital_inventory SET department_id = p_to_department_id WHERE id = p_item_id;
  ELSIF p_movement_type = 'adjusted' THEN
    IF p_quantity IS NULL OR p_quantity = 0 THEN RAISE EXCEPTION 'Adjustment must not be zero'; END IF;
    v_new_qty := v_item.quantity_available + p_quantity;
    IF v_new_qty < 0 THEN
      RAISE EXCEPTION 'Adjustment would take stock below zero: % available', v_item.quantity_available;
    END IF;
    UPDATE public.hospital_inventory SET quantity_available = v_new_qty WHERE id = p_item_id;
  ELSE
    IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF p_movement_type = 'received' THEN
      v_new_qty := v_item.quantity_available + p_quantity;
      UPDATE public.hospital_inventory
      SET quantity_available = v_new_qty, last_restocked_at = now()
      WHERE id = p_item_id;
    ELSE
      IF v_item.quantity_available < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock: % available, % requested', v_item.quantity_available, p_quantity;
      END IF;
      v_new_qty := v_item.quantity_available - p_quantity;
      UPDATE public.hospital_inventory SET quantity_available = v_new_qty WHERE id = p_item_id;
    END IF;
  END IF;

  INSERT INTO public.hospital_inventory_movements
    (institution_id, item_id, movement_type, quantity, quantity_before, quantity_after,
     from_department_id, to_department_id, reason, reference, performed_by)
  VALUES
    (v_item.institution_id, p_item_id, p_movement_type,
     CASE WHEN p_movement_type = 'transferred' THEN v_item.quantity_available ELSE p_quantity END,
     v_item.quantity_available, v_new_qty,
     v_from_dept, CASE WHEN p_movement_type = 'transferred' THEN p_to_department_id ELSE v_from_dept END,
     p_reason, p_reference, auth.uid())
  RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.apply_hospital_stock_movement(uuid, text, integer, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_hospital_stock_movement(uuid, text, integer, text, uuid, text) TO authenticated, service_role;

-- INV-3: erp_inventory becomes a live module for hospital tiers, and primary
-- tier gains a charter row (it previously existed only as planned/secondary+).
UPDATE public.facility_module_charter SET status = 'live' WHERE module_key = 'erp_inventory';
INSERT INTO public.facility_module_charter (tier, module_key, module_name, description, status, display_order)
SELECT 'primary', module_key, module_name, description, 'live', display_order
FROM public.facility_module_charter
WHERE module_key = 'erp_inventory' AND tier = 'secondary'
  AND NOT EXISTS (SELECT 1 FROM public.facility_module_charter c2
                  WHERE c2.module_key = 'erp_inventory' AND c2.tier = 'primary');

-- INV-11: CSSD department links point at the real per-institution department
-- table (both CSSD tables are empty; the global `departments` table is an
-- institution-less orphan).
ALTER TABLE public.cssd_items DROP CONSTRAINT IF EXISTS cssd_items_department_id_fkey;
ALTER TABLE public.cssd_items ADD CONSTRAINT cssd_items_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.hospital_departments(id);
ALTER TABLE public.cssd_transactions DROP CONSTRAINT IF EXISTS cssd_transactions_department_id_fkey;
ALTER TABLE public.cssd_transactions ADD CONSTRAINT cssd_transactions_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.hospital_departments(id);
