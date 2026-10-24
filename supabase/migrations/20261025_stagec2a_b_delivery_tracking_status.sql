-- Stage C2a Cluster B — discovered blocker for the P2-5 legit-flow
-- proof (and for marketplace checkout generally):
--
-- trg_orders_create_delivery_tracking fires on EVERY orders INSERT and
-- inserts a delivery_tracking row with status 'pending', but
-- delivery_tracking_status_check only allows
-- ('assigned','picked_up','in_transit','delivered'). Result: every
-- marketplace order INSERT — including the patient's own checkout in
-- useMarketplace — fails with a 23514 check violation (proven live
-- 2026-10-24 while seeding the P2-1/P2-5 proofs; the orders table is
-- empty in production, consistent with checkout being broken).
--
-- The trigger's vocabulary is the intended lifecycle start (a fresh
-- order's delivery is pending, not "assigned" — no courier exists
-- yet), so the CHECK is extended to include 'pending' rather than
-- falsifying the trigger's status.

ALTER TABLE public.delivery_tracking
  DROP CONSTRAINT IF EXISTS delivery_tracking_status_check;

ALTER TABLE public.delivery_tracking
  ADD CONSTRAINT delivery_tracking_status_check
  CHECK (status = ANY (ARRAY['pending','assigned','picked_up','in_transit','delivered']));
