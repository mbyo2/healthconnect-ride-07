-- Fix: the Expiry Radar "quarantine expired batches" sweep always failed
-- (proven live 2026-11-24) whenever an institution had an expired batch
-- still in qa_status 'pending': quarantine_expired_batches moved it to
-- 'quarantined' without a qa_checked_by, and the check_qa_maker_checker
-- trigger — which guards EVERY transition out of 'pending' — raised
-- "QA decision requires a checker (qa_checked_by)", rolling the whole
-- sweep back.
--
-- Quarantine is a protective action (it removes stock from circulation),
-- not a quality approval, so maker-checker separation does not apply to
-- moving INTO 'quarantined'. Decisions that make stock usable or destroy
-- it (approved / rejected) keep the full rule: a checker is required and
-- must differ from the receiver. Releasing a quarantined batch back to
-- 'approved' remains guarded by the service layer (releaser must differ
-- from the user recorded in qa_checked_by).
--
-- The sweep now also stamps qa_checked_by / qa_checked_at with the
-- caller when it quarantines a pending batch, so the quarantiner is on
-- record for the release separation check.
--
-- CREATE OR REPLACE preserves the existing ACLs on both functions.
--
-- Second layer of the same defect (found on the retest): the sweep's
-- audit movement uses quantity_change = 0 (quarantine moves no stock —
-- the batch stays on the shelf, blocked by its status), but
-- batch_stock_movements_quantity_change_check forbids 0 outright, so
-- the sweep could never complete for ANY batch. The anti-noop guard is
-- kept for every stock-affecting movement type; only the two QA marker
-- types (qa_quarantine / qa_release) may post a 0-change marker.
-- apply_batch_movement adds the change to quantity_remaining, so a
-- 0-change marker leaves stock untouched and records quantity_after
-- as the current remaining — exactly the intended ledger semantics.

ALTER TABLE public.batch_stock_movements
  DROP CONSTRAINT batch_stock_movements_quantity_change_check;

ALTER TABLE public.batch_stock_movements
  ADD CONSTRAINT batch_stock_movements_quantity_change_check
  CHECK (quantity_change <> 0 OR movement_type IN ('qa_quarantine', 'qa_release'));

CREATE OR REPLACE FUNCTION public.check_qa_maker_checker()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.qa_status = 'pending' AND NEW.qa_status NOT IN ('pending', 'quarantined') THEN
    IF NEW.qa_checked_by IS NULL THEN
      RAISE EXCEPTION 'QA decision requires a checker (qa_checked_by)';
    END IF;
    IF NEW.qa_checked_by = OLD.received_by THEN
      RAISE EXCEPTION 'QA checker must differ from the receiver (separation of duties)';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.quarantine_expired_batches(p_institution_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
  v_batch RECORD;
BEGIN
  IF p_institution_id IS NULL THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
      RAISE EXCEPTION 'Not authorized to quarantine batches across institutions';
    END IF;
  ELSIF NOT public.is_pharmacy_operator(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorized to quarantine batches for this institution';
  END IF;

  v_count := 0;
  FOR v_batch IN
    SELECT id, institution_id, expiry_date, quantity_remaining, unit_cost, qa_status
      FROM public.medicine_batches
     WHERE expiry_date < CURRENT_DATE
       AND qa_status IN ('approved', 'pending')
       AND is_active
       AND (p_institution_id IS NULL OR institution_id = p_institution_id)
     FOR UPDATE
  LOOP
    UPDATE public.medicine_batches
       SET qa_status = 'quarantined',
           qa_checked_by = CASE WHEN v_batch.qa_status = 'pending' THEN auth.uid() ELSE qa_checked_by END,
           qa_checked_at = CASE WHEN v_batch.qa_status = 'pending' THEN now() ELSE qa_checked_at END,
           qa_notes = COALESCE(qa_notes || ' ', '') || '[Auto-quarantined: expired ' || v_batch.expiry_date::text || ']',
           updated_at = now()
     WHERE id = v_batch.id;

    INSERT INTO public.batch_stock_movements
      (institution_id, batch_id, movement_type, quantity_change, quantity_after,
       unit_cost, reference_type, notes)
    VALUES
      (v_batch.institution_id, v_batch.id, 'qa_quarantine', 0, v_batch.quantity_remaining,
       v_batch.unit_cost, 'expiry_sweep',
       'Auto-quarantined: expired ' || v_batch.expiry_date::text);

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;
