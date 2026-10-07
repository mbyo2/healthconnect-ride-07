-- 2026-10-07: Drug Stock Management module tables + RLS.
--
-- drug_stock_items: institutional medicine inventory (distinct from pharmacy retail).
--   One row per drug batch; quantity decrements as stock is issued.
-- drug_stock_movements: audit trail for every receive/issue/adjust/expire/damage.
-- RLS: institution staff/admins manage via SECURITY DEFINER helper (no inline
--   cross-table RLS subqueries). Uses institution_staff.provider_id per live schema.

CREATE TABLE IF NOT EXISTS public.drug_stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  generic_name text,
  strength text,
  dosage_form text,
  batch_number text,
  quantity numeric(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'units',
  expiry_date date,
  reorder_level numeric(12,2) NOT NULL DEFAULT 0,
  supplier text,
  unit_cost numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, drug_name, batch_number)
);

CREATE TABLE IF NOT EXISTS public.drug_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  drug_stock_item_id uuid NOT NULL REFERENCES public.drug_stock_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('received', 'issued', 'adjusted', 'expired', 'damaged')),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  quantity_before numeric(12,2) NOT NULL,
  quantity_after numeric(12,2) NOT NULL,
  reason text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drug_stock_items_institution ON public.drug_stock_items (institution_id);
CREATE INDEX IF NOT EXISTS idx_drug_stock_items_expiry ON public.drug_stock_items (expiry_date);
CREATE INDEX IF NOT EXISTS idx_drug_stock_movements_item ON public.drug_stock_movements (drug_stock_item_id);
CREATE INDEX IF NOT EXISTS idx_drug_stock_movements_institution ON public.drug_stock_movements (institution_id);

ALTER TABLE public.drug_stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_stock_movements ENABLE ROW LEVEL SECURITY;

-- Opaque staff check (bypasses RLS inside; avoids recursion in policies).
-- Reuses the same helper created by the ICU migration if present.
CREATE OR REPLACE FUNCTION public.user_is_institution_staff_for_institution(
  p_viewer_id uuid,
  p_institution_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_personnel ip
    WHERE ip.user_id = p_viewer_id AND ip.institution_id = p_institution_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.healthcare_institutions hi
    WHERE hi.id = p_institution_id AND hi.admin_id = p_viewer_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.institution_staff ist
    WHERE ist.provider_id = p_viewer_id AND ist.institution_id = p_institution_id AND ist.is_active
  );
$$;

-- ── drug_stock_items policies ─────────────────────────────────────
DROP POLICY IF EXISTS "Drug stock staff manage items" ON public.drug_stock_items;
CREATE POLICY "Drug stock staff manage items"
ON public.drug_stock_items FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
)
WITH CHECK (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- ── drug_stock_movements policies ─────────────────────────────────
DROP POLICY IF EXISTS "Drug stock staff manage movements" ON public.drug_stock_movements;
CREATE POLICY "Drug stock staff manage movements"
ON public.drug_stock_movements FOR ALL TO authenticated
USING (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
)
WITH CHECK (
  public.user_is_institution_staff_for_institution(auth.uid(), institution_id)
  OR public.has_admin_scope(auth.uid())
);

-- Atomic stock movement: validates quantity, updates the item, writes the audit row.
CREATE OR REPLACE FUNCTION public.apply_drug_stock_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_qty numeric;
  v_movement_id uuid;
BEGIN
  SELECT * INTO v_item FROM public.drug_stock_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drug stock item not found';
  END IF;
  IF p_movement_type NOT IN ('received', 'issued', 'adjusted', 'expired', 'damaged') THEN
    RAISE EXCEPTION 'Invalid movement type: %', p_movement_type;
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  IF p_movement_type = 'received' OR p_movement_type = 'adjusted' THEN
    -- adjusted with a positive quantity increases stock; use a negative movement
    -- via a second call pattern is discouraged — adjusted always adds here.
    v_new_qty := v_item.quantity + p_quantity;
  ELSE
    -- issued / expired / damaged decrease stock
    IF v_item.quantity < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock: % available, % requested', v_item.quantity, p_quantity;
    END IF;
    v_new_qty := v_item.quantity - p_quantity;
  END IF;

  UPDATE public.drug_stock_items SET quantity = v_new_qty WHERE id = p_item_id;

  INSERT INTO public.drug_stock_movements (
    institution_id, drug_stock_item_id, movement_type, quantity,
    quantity_before, quantity_after, reason, performed_by
  ) VALUES (
    v_item.institution_id, p_item_id, p_movement_type, p_quantity,
    v_item.quantity, v_new_qty, p_reason, auth.uid()
  ) RETURNING id INTO v_movement_id;

  RETURN v_movement_id;
END;
$$;

-- ── Charter: drug_stock is now live ───────────────────────────────
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'drug_stock' AND status = 'planned';
