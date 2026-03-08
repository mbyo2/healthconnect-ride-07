
-- POS Sales table
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL,
  cashier_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  sale_type text NOT NULL DEFAULT 'walk_in' CHECK (sale_type IN ('walk_in', 'prescription', 'online_order')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'insurance', 'credit')),
  payment_reference text,
  prescription_id uuid,
  order_id uuid,
  receipt_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'voided', 'pending')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- POS Sale Items
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
  medication_inventory_id uuid,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  batch_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- POS Cash Register Sessions
CREATE TABLE IF NOT EXISTS public.pos_register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL,
  cashier_id uuid NOT NULL,
  opening_balance numeric(10,2) NOT NULL DEFAULT 0,
  closing_balance numeric(10,2),
  expected_balance numeric(10,2),
  cash_sales numeric(10,2) NOT NULL DEFAULT 0,
  mobile_money_sales numeric(10,2) NOT NULL DEFAULT 0,
  card_sales numeric(10,2) NOT NULL DEFAULT 0,
  total_sales numeric(10,2) NOT NULL DEFAULT 0,
  total_refunds numeric(10,2) NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closing_notes text
);

-- Pharmacy customers for loyalty/repeat tracking
CREATE TABLE IF NOT EXISTS public.pharmacy_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL,
  patient_id uuid,
  name text NOT NULL,
  phone text,
  email text,
  insurance_provider text,
  insurance_number text,
  total_purchases numeric(10,2) NOT NULL DEFAULT 0,
  visit_count integer NOT NULL DEFAULT 0,
  last_visit_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Receipt number sequence function
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_pharmacy_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_date text;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count FROM pos_sales 
    WHERE pharmacy_id = p_pharmacy_id AND created_at::date = CURRENT_DATE;
  RETURN 'RCP-' || v_date || '-' || LPAD(v_count::text, 4, '0');
END;
$$;

-- Auto-update inventory on POS sale
CREATE OR REPLACE FUNCTION public.pos_sale_update_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.medication_inventory_id IS NOT NULL THEN
    UPDATE medication_inventory 
    SET quantity_available = quantity_available - NEW.quantity
    WHERE id = NEW.medication_inventory_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pos_sale_item_deduct_inventory
  AFTER INSERT ON pos_sale_items
  FOR EACH ROW
  EXECUTE FUNCTION pos_sale_update_inventory();

-- Auto-update register session totals
CREATE OR REPLACE FUNCTION public.pos_sale_update_register()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE pos_register_sessions
  SET 
    total_sales = total_sales + NEW.total_amount,
    transaction_count = transaction_count + 1,
    cash_sales = cash_sales + CASE WHEN NEW.payment_method = 'cash' THEN NEW.total_amount ELSE 0 END,
    mobile_money_sales = mobile_money_sales + CASE WHEN NEW.payment_method = 'mobile_money' THEN NEW.total_amount ELSE 0 END,
    card_sales = card_sales + CASE WHEN NEW.payment_method = 'card' THEN NEW.total_amount ELSE 0 END
  WHERE pharmacy_id = NEW.pharmacy_id 
    AND cashier_id = NEW.cashier_id 
    AND status = 'open';
  RETURN NEW;
END;
$$;

CREATE TRIGGER pos_sale_update_register_totals
  AFTER INSERT ON pos_sales
  FOR EACH ROW
  EXECUTE FUNCTION pos_sale_update_register();

-- RLS policies
ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy staff can manage sales" ON pos_sales FOR ALL TO authenticated
  USING (cashier_id = auth.uid() OR public.is_service_role());

CREATE POLICY "Pharmacy staff can manage sale items" ON pos_sale_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM pos_sales WHERE pos_sales.id = pos_sale_items.sale_id AND pos_sales.cashier_id = auth.uid()) OR public.is_service_role());

CREATE POLICY "Pharmacy staff can manage register" ON pos_register_sessions FOR ALL TO authenticated
  USING (cashier_id = auth.uid() OR public.is_service_role());

CREATE POLICY "Pharmacy staff can manage customers" ON pharmacy_customers FOR ALL TO authenticated
  USING (true);
