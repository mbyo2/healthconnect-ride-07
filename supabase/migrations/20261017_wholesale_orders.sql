-- ============================================================================
-- Wholesale pharmacy B2B: bulk orders between institutions.
-- Previously the wholesale_pharmacy role was routed to the RETAIL
-- pharmacy console — no B2B functionality existed.
--
-- SECURITY MODEL:
--  1. A wholesale order links a buyer institution (clinic/hospital) to a
--     seller pharmacy institution.
--  2. Staff of either side can view their orders; the seller's staff
--     confirm/ship/deliver; the buyer can cancel pending orders.
--  3. Wholesale price tiers are managed by the seller pharmacy's staff
--     (INSERT/UPDATE/DELETE), readable by any authenticated user so
--     buyers can see tiered pricing before ordering.
--  4. All cross-table checks via SECURITY DEFINER helpers.
-- ============================================================================

-- 1. Wholesale price tiers (volume discounts per product)
CREATE TABLE IF NOT EXISTS public.wholesale_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.pharmacy_inventory(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_tier UNIQUE (pharmacy_id, product_name, min_quantity)
);

CREATE INDEX IF NOT EXISTS idx_wholesale_tiers_pharmacy ON public.wholesale_price_tiers(pharmacy_id);

ALTER TABLE public.wholesale_price_tiers ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (buyers need to see tier pricing).
DROP POLICY IF EXISTS "Anyone can view wholesale tiers" ON public.wholesale_price_tiers;
CREATE POLICY "Anyone can view wholesale tiers"
ON public.wholesale_price_tiers FOR SELECT TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: staff of the seller pharmacy only.
DROP POLICY IF EXISTS "Seller staff manage wholesale tiers" ON public.wholesale_price_tiers;
CREATE POLICY "Seller staff manage wholesale tiers"
ON public.wholesale_price_tiers FOR ALL TO authenticated
USING (public.is_institution_staff_member(pharmacy_id))
WITH CHECK (public.is_institution_staff_member(pharmacy_id));

DROP TRIGGER IF EXISTS trg_wholesale_tiers_updated_at ON public.wholesale_price_tiers;
CREATE TRIGGER trg_wholesale_tiers_updated_at
  BEFORE UPDATE ON public.wholesale_price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Wholesale (B2B) orders
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  buyer_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  seller_pharmacy_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  ordered_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_wholesale CHECK (buyer_institution_id <> seller_pharmacy_id)
);

CREATE INDEX IF NOT EXISTS idx_wholesale_orders_buyer ON public.wholesale_orders(buyer_institution_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_seller ON public.wholesale_orders(seller_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_status ON public.wholesale_orders(status);

ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: staff of either side, plus platform roles.
DROP POLICY IF EXISTS "Order parties view wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Order parties view wholesale orders"
ON public.wholesale_orders FOR SELECT TO authenticated
USING (
  public.is_institution_staff_member(buyer_institution_id)
  OR public.is_institution_staff_member(seller_pharmacy_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- INSERT: buyer institution staff place the order.
DROP POLICY IF EXISTS "Buyer staff place wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Buyer staff place wholesale orders"
ON public.wholesale_orders FOR INSERT TO authenticated
WITH CHECK (
  public.is_institution_staff_member(buyer_institution_id)
  AND ordered_by = auth.uid()
  AND status = 'pending'
);

-- UPDATE: seller advances the order (confirm/ship/deliver); buyer can
-- only cancel their own pending order.
DROP POLICY IF EXISTS "Seller advances wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Seller advances wholesale orders"
ON public.wholesale_orders FOR UPDATE TO authenticated
USING (public.is_institution_staff_member(seller_pharmacy_id))
WITH CHECK (public.is_institution_staff_member(seller_pharmacy_id));

DROP POLICY IF EXISTS "Buyer cancels pending wholesale orders" ON public.wholesale_orders;
CREATE POLICY "Buyer cancels pending wholesale orders"
ON public.wholesale_orders FOR UPDATE TO authenticated
USING (
  public.is_institution_staff_member(buyer_institution_id)
  AND status = 'pending'
)
WITH CHECK (
  public.is_institution_staff_member(buyer_institution_id)
  AND status = 'cancelled'
);

-- No DELETE: order history is the audit trail.

DROP TRIGGER IF EXISTS trg_wholesale_orders_updated_at ON public.wholesale_orders;
CREATE TRIGGER trg_wholesale_orders_updated_at
  BEFORE UPDATE ON public.wholesale_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Order number sequence helper
CREATE OR REPLACE FUNCTION public.next_wholesale_order_number()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- Simple date-based sequence; collisions are prevented by the UNIQUE
  -- constraint and the UI retries on conflict.
  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.wholesale_orders
  WHERE created_at::date = CURRENT_DATE;
  RETURN 'WS-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;
