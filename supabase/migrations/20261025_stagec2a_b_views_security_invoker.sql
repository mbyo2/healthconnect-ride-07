-- Stage C2a Cluster B — P2-15: accounting views bypassed RLS.
--
-- pharmacy_stock_valuation and pharmacy_writeoff_summary aggregate
-- medicine_batches / stock_writeoffs across ALL institutions. The
-- views had no security_invoker option (reloptions NULL, verified
-- live), so they executed with the view owner's privileges and the
-- base tables' carefully scoped policies (is_pharmacy_operator /
-- can_approve_pharmacy_adjustments, both institution-scoped DEFINER
-- helpers) were bypassed for anyone holding view SELECT — which the
-- live ACL grants to anon AND authenticated (cross-institution stock
-- valuation = a theft-targeting inventory map).
--
-- Fix: security_invoker = true on both views so the caller's own RLS
-- on the base tables applies, and revoke anon's direct SELECT on the
-- views (no anonymous flow reads them; the pharmacy UI is
-- authenticated — pharmacyStockService.ts).

ALTER VIEW public.pharmacy_stock_valuation SET (security_invoker = true);
ALTER VIEW public.pharmacy_writeoff_summary SET (security_invoker = true);

REVOKE SELECT ON public.pharmacy_stock_valuation FROM anon;
REVOKE SELECT ON public.pharmacy_writeoff_summary FROM anon;
