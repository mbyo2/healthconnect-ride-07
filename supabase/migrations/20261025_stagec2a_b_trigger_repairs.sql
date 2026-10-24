-- Stage C2a Cluster B — repairs for two pre-existing live breakages
-- found while running the P2-4 / P2-5 behavioural proofs (2026-10-24).
-- Both sit directly on this cluster's legit-flow paths.
--
-- (1) EVERY vital_signs INSERT by an authenticated user failed with
--     42501 "permission denied for function is_provider_suspended".
--     Chain: trigger trg_block_suspended -> block_suspended_provider()
--     is SECURITY INVOKER and calls is_provider_suspended(), whose
--     EXECUTE was revoked from authenticated in the P2-16 ACL sweep
--     (live ACL: postgres + service_role only). The sibling vitals
--     triggers (block_suspended_institution, stamp_vital_signs_
--     authorship) are DEFINER and unaffected.
--     Fix: make both INVOKER guard triggers SECURITY DEFINER with a
--     pinned search_path — the pattern every other trigger function
--     on this table already uses. Bodies are unchanged and only ever
--     read the caller's own suspension/verification state and raise;
--     their ACLs stay locked (postgres + service_role).
--
-- (2) Marketplace order totals never recalculated for client-created
--     orders: recalculate_order_total() (AFTER trigger on
--     order_items) UPDATEs orders.total_amount, but
--     enforce_order_total_integrity() pinned total_amount for every
--     non-service-role JWT — including the patient's own JWT under
--     which the recalculation runs — silently reverting the computed
--     total to 0 (proven live: items worth K100/K150, total stayed
--     0.00). The checkout flow re-reads the order expecting the real
--     total before payment.
--     Fix: the pin now exempts exactly one value — the actual sum of
--     the order's item rows, which is what the server-side recalc
--     writes. A client still cannot set any other total.

ALTER FUNCTION public.block_suspended_provider() SECURITY DEFINER;
ALTER FUNCTION public.block_suspended_provider() SET search_path = public;
ALTER FUNCTION public.block_unverified_provider() SECURITY DEFINER;
ALTER FUNCTION public.block_unverified_provider() SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_order_total_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.total_amount := 0;
  ELSIF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    IF NEW.total_amount IS DISTINCT FROM (
      SELECT COALESCE(SUM(oi.total_price), 0)
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id
    ) THEN
      NEW.total_amount := OLD.total_amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
