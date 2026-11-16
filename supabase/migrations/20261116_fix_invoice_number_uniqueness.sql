-- Invoice numbers must be unique platform-wide (docswarm billing, 2026-11-16).
--
-- BUG (live-proven): generate_invoice_number() counted same-day invoices
-- PER INSTITUTION, so two facilities creating their first invoice of the
-- day both got INV-20261116-0001 (two live rows, different institutions,
-- identical number). It also raced: two concurrent inserts at one
-- institution both counted N and both took N+1, with no unique constraint
-- to catch it. An invoice number is what patients quote when they pay and
-- what support matches a payment to, so a shared number is a real
-- reconciliation ambiguity, not a cosmetic quirk.
--
-- Fix: serialize number assignment for the day with an advisory lock and
-- count across ALL institutions. The format is unchanged
-- (INV-YYYYMMDD-NNNN); sequences now interleave across facilities instead
-- of restarting per facility. No unique index is added here: duplicate
-- numbers already issued today would block index creation — that dedupe
-- is a separate data repair.
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- One number per day, platform-wide. The advisory lock (held to end of
  -- transaction) makes the count-then-insert atomic across concurrent
  -- inserts; a row trigger also sees rows this transaction already
  -- inserted, so a multi-row INSERT cannot repeat a number either.
  PERFORM pg_advisory_xact_lock(20261116);
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.billing_invoices
  WHERE created_at::date = CURRENT_DATE;

  NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;
