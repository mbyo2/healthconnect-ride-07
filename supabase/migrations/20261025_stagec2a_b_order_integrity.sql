-- Stage C2a Cluster B — P2-5: marketplace order integrity.
--
-- Live state before this migration (2026-10-24):
--   * orders INSERT policies check only patient_id = auth.uid() — a
--     patient could insert an order born in ANY status (e.g. 'confirmed',
--     the status process-wallet-payment sets AFTER payment).
--   * order_items carries a FOR ALL policy ("Service role can manage
--     order items") whose patient branch has no WITH CHECK and no status
--     condition: the patient can INSERT/UPDATE/DELETE items on their own
--     order at ANY status, and the DEFINER trigger
--     recalculate_order_total() then rewrites orders.total_amount —
--     decoupling what the pharmacy dispenses from what was paid.
--   * orders totals/prices were already pinned by the stage-B triggers
--     enforce_order_total_integrity / enforce_order_item_price, and no
--     patient UPDATE policy exists on orders itself; the holes above are
--     the residual.
--
-- Fix (BEFORE triggers, the stagec3 pattern — they bind regardless of
-- which policy a future change adds):
--   1. Client INSERTs of orders are born 'pending', always.
--   2. A patient writing their OWN order row (defence in depth) cannot
--      move patient_id/pharmacy_id/prescription_id, cannot set any
--      status other than 'pending'/'cancelled' pre-payment, and once
--      the order has left 'pending' cannot change status except a
--      cancel request ('cancelled').
--   3. order_items are frozen for every non-service-role caller once
--      the parent order has left 'pending'. Payment marking is done by
--      edge functions with the service-role client (process-wallet-
--      payment), and no client flow edits items post-payment (checked
--      src: only useMarketplace inserts items, pre-payment).

CREATE OR REPLACE FUNCTION public.pin_marketplace_order_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Orders are born pending; payment is what moves them on.
    NEW.status := 'pending';
    RETURN NEW;
  END IF;

  -- UPDATE: constrain only the patient acting on their own order.
  -- Pharmacy staff / institution admins keep their policy-granted
  -- fulfilment transitions (marketplace-workflows).
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.patient_id
     AND NOT (
       OLD.pharmacy_id IS NOT NULL
       AND (public.is_institution_admin(OLD.pharmacy_id)
            OR public.is_institution_staff_member(OLD.pharmacy_id))
     ) THEN
    NEW.patient_id := OLD.patient_id;
    NEW.pharmacy_id := OLD.pharmacy_id;
    NEW.prescription_id := OLD.prescription_id;
    IF OLD.status = 'pending' THEN
      IF NEW.status NOT IN ('pending', 'cancelled') THEN
        NEW.status := OLD.status;
      END IF;
    ELSE
      -- Paid / in fulfilment: only a cancel request may change status.
      IF NEW.status <> OLD.status AND NEW.status <> 'cancelled' THEN
        NEW.status := OLD.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pin_marketplace_order_writes ON public.orders;
CREATE TRIGGER trg_pin_marketplace_order_writes
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.pin_marketplace_order_writes();

CREATE OR REPLACE FUNCTION public.guard_order_items_after_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF public.is_service_role() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO v_status
  FROM public.orders
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Order items are locked once the order has left pending status'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_items_after_payment ON public.order_items;
CREATE TRIGGER trg_guard_order_items_after_payment
  BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_items_after_payment();

-- Trigger functions are not client-callable surface, but keep the
-- post-P2-16 ACL posture explicit anyway.
REVOKE ALL ON FUNCTION public.pin_marketplace_order_writes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_order_items_after_payment() FROM PUBLIC, anon, authenticated;
