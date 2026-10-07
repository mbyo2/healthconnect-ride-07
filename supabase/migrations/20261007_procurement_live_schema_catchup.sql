-- Procurement live-schema catch-up (2026-10-07)
--
-- The live public.purchase_orders / public.purchase_order_items tables
-- pre-date the procurement module and use different column names than the
-- module was originally written against. This migration aligns the live
-- schema with what the UI needs:
--
-- 1. purchase_orders.supplier_id FK now points at the new
--    public.procurement_suppliers table (was: legacy public.suppliers).
-- 2. purchase_order_items gains the `unit` text column the PO form writes.
--
-- Both changes were applied live via the Supabase dashboard on 2026-10-07
-- during QA; this file records them for the repo.

-- ── 1. Supplier FK → procurement_suppliers ──────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchase_orders_supplier_id_fkey'
      AND conrelid = 'public.purchase_orders'::regclass
  ) THEN
    -- Only drop if it still points at the legacy suppliers table
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.confrelid
      WHERE c.conname = 'purchase_orders_supplier_id_fkey'
        AND c.conrelid = 'public.purchase_orders'::regclass
        AND t.relname = 'suppliers'
    ) THEN
      ALTER TABLE public.purchase_orders
        DROP CONSTRAINT purchase_orders_supplier_id_fkey;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchase_orders_supplier_id_fkey'
      AND conrelid = 'public.purchase_orders'::regclass
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_supplier_id_fkey
      FOREIGN KEY (supplier_id)
      REFERENCES public.procurement_suppliers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. unit column on purchase_order_items ──────────────────
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'units';
