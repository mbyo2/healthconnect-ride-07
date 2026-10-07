-- 2026-10-07: Procurement module (purchase orders + supplier management).
-- Tables: procurement_suppliers, purchase_orders, purchase_order_items.
-- RLS: institution staff/admins manage; no patient visibility.

-- ── procurement_suppliers ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.procurement_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  payment_terms text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proc_suppliers_institution ON public.procurement_suppliers(institution_id, supplier_name);
CREATE INDEX IF NOT EXISTS idx_proc_suppliers_active ON public.procurement_suppliers(institution_id) WHERE is_active = true;

-- ── purchase_orders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid REFERENCES public.procurement_suppliers(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','partially_received','received','cancelled')),
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, po_number)
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_institution ON public.purchase_orders(institution_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(institution_id, status);

-- ── purchase_order_items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'units',
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(po_id);

-- ── RLS ──────────────────────────────────────────────────
ALTER TABLE public.procurement_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Helper: staff or admin of the row's institution.
CREATE OR REPLACE FUNCTION public.user_manages_procurement_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.institution_staff s
      WHERE s.institution_id = p_institution_id
        AND s.provider_id = auth.uid()
        AND s.is_active
    )
    OR EXISTS (
      SELECT 1 FROM public.healthcare_institutions hi
      WHERE hi.id = p_institution_id
        AND hi.admin_id = auth.uid()
    )
    OR public.has_admin_scope(auth.uid());
$$;

-- suppliers policies
DROP POLICY IF EXISTS "Procurement staff manage suppliers" ON public.procurement_suppliers;
CREATE POLICY "Procurement staff manage suppliers"
  ON public.procurement_suppliers FOR ALL TO authenticated
  USING (public.user_manages_procurement_institution(institution_id))
  WITH CHECK (public.user_manages_procurement_institution(institution_id));

-- purchase_orders policies
DROP POLICY IF EXISTS "Procurement staff manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Procurement staff manage purchase orders"
  ON public.purchase_orders FOR ALL TO authenticated
  USING (public.user_manages_procurement_institution(institution_id))
  WITH CHECK (public.user_manages_procurement_institution(institution_id));

-- purchase_order_items policies (via parent PO's institution)
DROP POLICY IF EXISTS "Procurement staff manage po items" ON public.purchase_order_items;
CREATE POLICY "Procurement staff manage po items"
  ON public.purchase_order_items FOR ALL TO authenticated
  USING (
    public.user_manages_procurement_institution(
      (SELECT po.institution_id FROM public.purchase_orders po WHERE po.id = purchase_order_items.po_id)
    )
  )
  WITH CHECK (
    public.user_manages_procurement_institution(
      (SELECT po.institution_id FROM public.purchase_orders po WHERE po.id = purchase_order_items.po_id)
    )
  );

-- ── Charter: procurement goes live ──
UPDATE public.facility_module_charter
SET status = 'live'
WHERE module_key = 'procurement' AND status = 'planned';
