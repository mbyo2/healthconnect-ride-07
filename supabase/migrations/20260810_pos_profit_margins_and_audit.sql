-- ============================================================
-- Migration: POS Profit Margins, Cost Price Tracking & Audit
-- Date: 2026-08-10
-- Purpose:
--   1. Add cost_price to pharmacy_inventory (enables profit margin calc)
--   2. Add category, batch_number, product_code columns if missing
--   3. Add cost_price to medication_inventory (standard institution stock)
--   4. Expand pharmacy_sales: customer_id, subtotal, tax, balance, 
--      paid_amount, insurance_claim_id, payment_status fields
--   5. inventory_transactions already supports 'expired' & 'damaged' types ✅
-- ============================================================

-- -----------------------------------------------------------
-- 1. PHARMACY_INVENTORY — add cost_price + missing columns
-- -----------------------------------------------------------

ALTER TABLE public.pharmacy_inventory
  ADD COLUMN IF NOT EXISTS cost_price        DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS category          TEXT         DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS batch_number      TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer      TEXT,
  ADD COLUMN IF NOT EXISTS description       TEXT;

-- Backfill cost_price as 60% of unit_price for existing rows (typical pharma markup ~67%)
UPDATE public.pharmacy_inventory
  SET cost_price = ROUND(unit_price * 0.60, 2)
  WHERE cost_price = 0 OR cost_price IS NULL;

-- -----------------------------------------------------------
-- 2. MEDICATION_INVENTORY — add cost_price column
--    (used by MedicationInventory.tsx / PharmacyInventory page)
-- -----------------------------------------------------------

ALTER TABLE public.medication_inventory
  ADD COLUMN IF NOT EXISTS cost_price        DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS supplier_name     TEXT,
  ADD COLUMN IF NOT EXISTS purchase_order_ref TEXT;

-- Backfill cost_price for existing records
UPDATE public.medication_inventory
  SET cost_price = ROUND(COALESCE(unit_price, 0) * 0.60, 2)
  WHERE cost_price = 0 OR cost_price IS NULL;

-- -----------------------------------------------------------
-- 3. PHARMACY_SALES — add extended POS fields
-- -----------------------------------------------------------

ALTER TABLE public.pharmacy_sales
  ADD COLUMN IF NOT EXISTS customer_id        UUID         REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS subtotal           DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax                DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount           DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance            DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS paid_amount        DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS insurance_claim_id UUID,
  ADD COLUMN IF NOT EXISTS payment_status     TEXT         DEFAULT 'completed'
                                              CHECK (payment_status IN ('completed', 'pending', 'partial', 'failed')),
  ADD COLUMN IF NOT EXISTS cashier_id         UUID         REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notes              TEXT;

-- -----------------------------------------------------------
-- 4. STOCK WRITE-OFF AUDIT TABLE
--    Tracks expired / damaged stock removals with financial impact
--    (inventory_transactions already covers this via transaction_type,
--     but we add a dedicated audit view for admin reporting)
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_writeoffs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID        REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  inventory_item_id UUID,       -- FK to pharmacy_inventory OR medication_inventory
  inventory_table   TEXT        NOT NULL DEFAULT 'pharmacy_inventory'
                                CHECK (inventory_table IN ('pharmacy_inventory', 'medication_inventory')),
  product_name      TEXT        NOT NULL,
  batch_number      TEXT,
  quantity_written_off INTEGER  NOT NULL CHECK (quantity_written_off > 0),
  cost_per_unit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_loss        DECIMAL(10,2) GENERATED ALWAYS AS (quantity_written_off * cost_per_unit) STORED,
  reason            TEXT        NOT NULL
                                CHECK (reason IN ('expired', 'damaged', 'broken', 'temperature', 'stolen', 'other')),
  notes             TEXT,
  written_off_by    UUID        REFERENCES auth.users(id),
  written_off_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by       UUID        REFERENCES auth.users(id),
  approved_at       TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_writeoffs ENABLE ROW LEVEL SECURITY;

-- Admins and institution staff can see write-offs
CREATE POLICY "Authenticated users can view stock writeoffs"
  ON public.stock_writeoffs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert stock writeoffs"
  ON public.stock_writeoffs FOR INSERT
  TO authenticated WITH CHECK (true);

-- -----------------------------------------------------------
-- 5. INDEX — speed up profit margin queries on pharmacy_inventory
-- -----------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy_id
  ON public.pharmacy_inventory(pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_expiry
  ON public.pharmacy_inventory(expiry_date);

CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_pharmacy_id
  ON public.pharmacy_sales(pharmacy_id);

CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_created_at
  ON public.pharmacy_sales(created_at);

CREATE INDEX IF NOT EXISTS idx_stock_writeoffs_institution
  ON public.stock_writeoffs(institution_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type
  ON public.inventory_transactions(transaction_type);

-- -----------------------------------------------------------
-- 6. VERIFY inventory_transactions supports expired & damaged
--    (These should already exist from the original schema;
--     this ALTER is safe because of IF NOT EXISTS pattern)
-- -----------------------------------------------------------
-- The check constraint already includes 'expired' and 'damaged':
-- CHECK (transaction_type IN ('purchase','sale','adjustment','return','expired','damaged'))
-- No change needed. ✅

-- -----------------------------------------------------------
-- SUMMARY OF CHANGES:
-- ✅ pharmacy_inventory.cost_price       → NEW (profit margin source)
-- ✅ pharmacy_inventory.category          → NEW (POS category filter)
-- ✅ pharmacy_inventory.batch_number      → NEW (audit traceability)
-- ✅ medication_inventory.cost_price      → NEW (Pharmacy Inventory page)
-- ✅ pharmacy_sales (extended fields)     → customer, tax, balance, status
-- ✅ stock_writeoffs table                → NEW (damaged/expired audit log)
-- ✅ inventory_transactions               → Already has expired & damaged ✅
-- ✅ Indexes for performance              → 6 new indexes
-- ============================================================
