-- Marketplace order status history (audit fix follow-up, Cluster C, 2026-10-20)
--
-- src/utils/marketplace-workflows.ts (the order status state machine used
-- by the pharmacy board) reads/writes orders.status_history — but that
-- column does not exist on the live orders table (verified via PostgREST:
-- 42703), so every status transition failed even after the table name was
-- corrected from the phantom 'marketplace_orders'. The state machine also
-- powers getOrderHistory(), so the audit trail belongs on the order.
--
-- status_updated_at / status_updated_by are deliberately NOT added: the
-- actor + timestamp are recorded inside each status_history entry, and
-- orders.updated_at already tracks the last write.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]'::jsonb;
