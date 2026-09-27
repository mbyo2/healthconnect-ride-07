-- ============================================================================
-- Phase 1 DB hardening — POS join indexes (2026-09-27)
--
-- The tenant-scoped institution-admin POS policies (applied 2026-09-26)
-- join pos_sale_items.sale_id -> pos_sales.id and filter on
-- pos_sales.pharmacy_id. Live prod inspection 2026-09-27 showed both tables
-- carrying ONLY their primary-key indexes, so those policy joins would
-- seq-scan. These two indexes close that gap.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale_id
  ON public.pos_sale_items (sale_id);

CREATE INDEX IF NOT EXISTS idx_pos_sales_pharmacy_id
  ON public.pos_sales (pharmacy_id);

-- ============================================================================
-- VERIFICATION
--   SELECT indexname FROM pg_indexes WHERE schemaname='public'
--     AND indexname IN ('idx_pos_sale_items_sale_id','idx_pos_sales_pharmacy_id');
--     -> 2 rows
-- ============================================================================
