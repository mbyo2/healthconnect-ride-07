-- ============================================================
-- Doc'O Clock — Phase 0: pharmacy security + separation of duties
--
-- Fixes (from Phase 0 pharmacy audit, 2026-09-29):
--  GAP-10: dispense_medicine_batches() + quarantine_expired_batches()
--          had NO authorization check (SECURITY DEFINER, any authenticated
--          user could dispense/quarantine any institution's stock).
--  GAP-11: can_approve_pharmacy_adjustments() excluded super_admin.
--  GAP-17: stock_writeoffs SELECT/INSERT were USING(true)/WITH CHECK(true)
--          for ALL authenticated users (financial data leak, confirmed live).
--  GAP-05: no maker/checker on QA status changes (receiver could approve
--          their own batch).
--  GAP-06: audit approver could be the counter/submitter.
--  GAP-07: quarantine posted no ledger movement (qa_quarantine type unused).
--  GAP-08: quarantine only touched qa_status='approved'; pending batches
--          that expired stayed pending forever.
--  GAP-12: stock_audit_lines editable after session submission.
--  GAP-16: no institution-match validation between write-off/audit session
--          and the referenced batch (cross-institution manipulation).
--  GAP-19: medication_inventory.quantity_available had no negative floor.
--
-- GAP-18 (pharmacy_customers PII leak) was NOT reproduced live — the
-- permissive SELECT policy was already dropped; no change needed.
--
-- Idempotent; safe to re-run. Apply via Supabase SQL editor, then verify.
-- ============================================================

-- ─── GAP-11: approver set includes super_admin ───
CREATE OR REPLACE FUNCTION public.can_approve_pharmacy_adjustments(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_institution_admin(p_institution_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role);
$$;

-- ─── GAP-10: auth guard on FEFO dispense ───
CREATE OR REPLACE FUNCTION public.dispense_medicine_batches(
  p_institution_id   UUID,
  p_inventory_table  TEXT,
  p_inventory_item_id UUID,
  p_quantity         INTEGER,
  p_reference_type   TEXT DEFAULT NULL,
  p_reference_id     UUID DEFAULT NULL,
  p_notes            TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_batch     RECORD;
  v_take      INTEGER;
  v_alloc     JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_pharmacy_operator(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorized to dispense stock for this institution';
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;
  IF p_inventory_table NOT IN ('pharmacy_inventory', 'medication_inventory') THEN
    RAISE EXCEPTION 'Unknown inventory table: %', p_inventory_table;
  END IF;

  FOR v_batch IN
    SELECT id, batch_number, expiry_date, quantity_remaining, unit_cost
      FROM public.medicine_batches
     WHERE institution_id = p_institution_id
       AND inventory_table = p_inventory_table
       AND inventory_item_id = p_inventory_item_id
       AND is_active
       AND qa_status = 'approved'
       AND expiry_date >= CURRENT_DATE
       AND quantity_remaining > 0
     ORDER BY expiry_date ASC, received_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_batch.quantity_remaining, v_remaining);
    INSERT INTO public.batch_stock_movements
      (institution_id, batch_id, movement_type, quantity_change, quantity_after,
       unit_cost, reference_type, reference_id, notes)
    VALUES
      (p_institution_id, v_batch.id, 'dispense', -v_take, 0,
       v_batch.unit_cost, p_reference_type, p_reference_id,
       COALESCE(p_notes, 'FEFO dispense'));
    v_alloc := v_alloc || jsonb_build_object(
      'batch_id', v_batch.id,
      'batch_number', v_batch.batch_number,
      'expiry_date', v_batch.expiry_date,
      'quantity', v_take,
      'unit_cost', v_batch.unit_cost
    );
    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION
      'Insufficient dispensable stock: short by % units (approved, unexpired batches only)',
      v_remaining;
  END IF;

  RETURN jsonb_build_object('allocated', v_alloc, 'total', p_quantity);
END;
$$;

-- ─── GAP-10 + GAP-07 + GAP-08: quarantine with auth, pending coverage, ledger trace ───
CREATE OR REPLACE FUNCTION public.quarantine_expired_batches(p_institution_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
  v_batch RECORD;
BEGIN
  IF p_institution_id IS NULL THEN
    -- Cross-institution sweep: platform admins only.
    IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
      RAISE EXCEPTION 'Not authorized to quarantine batches across institutions';
    END IF;
  ELSIF NOT public.is_pharmacy_operator(p_institution_id) THEN
    RAISE EXCEPTION 'Not authorized to quarantine batches for this institution';
  END IF;

  v_count := 0;
  FOR v_batch IN
    SELECT id, institution_id, expiry_date, quantity_remaining, unit_cost
      FROM public.medicine_batches
     WHERE expiry_date < CURRENT_DATE
       AND qa_status IN ('approved', 'pending')
       AND is_active
       AND (p_institution_id IS NULL OR institution_id = p_institution_id)
     FOR UPDATE
  LOOP
    UPDATE public.medicine_batches
       SET qa_status = 'quarantined',
           qa_notes = COALESCE(qa_notes || ' ', '') ||
                      '[Auto-quarantined: expired ' || v_batch.expiry_date::text || ']',
           updated_at = now()
     WHERE id = v_batch.id;
    -- Ledger trace (GAP-07): quantity unchanged, status change recorded.
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
$$;

-- ─── GAP-17: scope stock_writeoffs SELECT/INSERT to the owning institution ───
DROP POLICY IF EXISTS "Authenticated users can view stock writeoffs" ON public.stock_writeoffs;
CREATE POLICY "Pharmacy operators view own writeoffs"
  ON public.stock_writeoffs FOR SELECT TO authenticated
  USING (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Authenticated users can insert stock writeoffs" ON public.stock_writeoffs;
CREATE POLICY "Pharmacy operators request writeoffs"
  ON public.stock_writeoffs FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_operator(institution_id));

-- Requester may edit/cancel their OWN pending request (GAP-22, minor UX).
DROP POLICY IF EXISTS "Requesters edit own pending writeoffs" ON public.stock_writeoffs;
CREATE POLICY "Requesters edit own pending writeoffs"
  ON public.stock_writeoffs FOR UPDATE TO authenticated
  USING (written_off_by = auth.uid() AND status = 'pending_approval')
  WITH CHECK (written_off_by = auth.uid() AND status = 'pending_approval');

-- ─── GAP-05: maker/checker on QA status changes ───
CREATE OR REPLACE FUNCTION public.check_qa_maker_checker()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.qa_status = 'pending' AND NEW.qa_status <> 'pending' THEN
    IF NEW.qa_checked_by IS NULL THEN
      RAISE EXCEPTION 'QA decision requires a checker (qa_checked_by)';
    END IF;
    IF NEW.qa_checked_by = OLD.received_by THEN
      RAISE EXCEPTION 'QA checker must differ from the receiver (separation of duties)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_check_qa_maker_checker ON public.medicine_batches;
CREATE TRIGGER trg_check_qa_maker_checker
  BEFORE UPDATE OF qa_status ON public.medicine_batches
  FOR EACH ROW EXECUTE FUNCTION public.check_qa_maker_checker();

-- ─── GAP-06 + GAP-16: audit approval — approver ≠ counter, institution match ───
CREATE OR REPLACE FUNCTION public.approve_stock_audit_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session RECORD;
  v_line    RECORD;
  v_batch_inst UUID;
  v_posted  INTEGER := 0;
BEGIN
  SELECT * INTO v_session FROM public.stock_audit_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit session not found';
  END IF;
  IF NOT public.can_approve_pharmacy_adjustments(v_session.institution_id) THEN
    RAISE EXCEPTION 'Not authorized to approve audit sessions';
  END IF;
  IF v_session.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted sessions can be approved (current: %)', v_session.status;
  END IF;
  -- GAP-06: separation of duties — approver must differ from counter/submitter.
  IF v_session.approved_by IS NOT NULL AND v_session.approved_by = auth.uid() THEN
    RAISE EXCEPTION 'Approver must differ from the submitter';
  END IF;
  IF v_session.started_by = auth.uid() OR v_session.submitted_by = auth.uid() THEN
    RAISE EXCEPTION 'Audit approver must differ from the counter/submitter (separation of duties)';
  END IF;

  FOR v_line IN
    SELECT * FROM public.stock_audit_lines
     WHERE session_id = p_session_id
       AND counted_quantity IS NOT NULL
       AND variance <> 0
  LOOP
    -- GAP-16: batch must belong to the session's institution.
    SELECT institution_id INTO v_batch_inst FROM public.medicine_batches WHERE id = v_line.batch_id;
    IF v_batch_inst IS DISTINCT FROM v_session.institution_id THEN
      RAISE EXCEPTION 'Audit line references a batch from another institution';
    END IF;
    INSERT INTO public.batch_stock_movements
      (institution_id, batch_id, movement_type, quantity_change, quantity_after,
       unit_cost, reference_type, reference_id, notes)
    SELECT v_session.institution_id, v_line.batch_id, 'adjustment', v_line.variance, 0,
           mb.unit_cost, 'audit', p_session_id,
           'Audit adjustment from session: ' || v_session.title
      FROM public.medicine_batches mb WHERE mb.id = v_line.batch_id;
    v_posted := v_posted + 1;
  END LOOP;

  UPDATE public.stock_audit_sessions
     SET status = 'approved', approved_by = auth.uid(), approved_at = now(), updated_at = now()
   WHERE id = p_session_id;

  RETURN jsonb_build_object('posted_adjustments', v_posted);
END;
$$;

-- ─── GAP-16: institution-match validation on write-off posting ───
CREATE OR REPLACE FUNCTION public.post_stock_writeoff(p_writeoff_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wo RECORD;
  v_batch_inst UUID;
BEGIN
  SELECT * INTO v_wo FROM public.stock_writeoffs WHERE id = p_writeoff_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Write-off not found';
  END IF;
  IF NOT public.can_approve_pharmacy_adjustments(v_wo.institution_id) THEN
    RAISE EXCEPTION 'Not authorized to post write-offs';
  END IF;
  IF v_wo.status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved write-offs can be posted (current: %)', v_wo.status;
  END IF;
  IF v_wo.batch_id IS NULL THEN
    RAISE EXCEPTION 'Write-off has no batch linked';
  END IF;
  SELECT institution_id INTO v_batch_inst FROM public.medicine_batches WHERE id = v_wo.batch_id;
  IF v_batch_inst IS DISTINCT FROM v_wo.institution_id THEN
    RAISE EXCEPTION 'Write-off batch belongs to another institution';
  END IF;

  INSERT INTO public.batch_stock_movements
    (institution_id, batch_id, movement_type, quantity_change, quantity_after,
     unit_cost, reference_type, reference_id, notes)
  VALUES
    (v_wo.institution_id, v_wo.batch_id, 'write_off', -v_wo.quantity_written_off, 0,
     v_wo.cost_per_unit, 'write_off', v_wo.id,
     'Write-off (' || v_wo.reason || ')' || COALESCE(' — ' || NULLIF(v_wo.notes, ''), ''));

  UPDATE public.stock_writeoffs SET status = 'posted' WHERE id = p_writeoff_id;
END;
$$;

-- ─── GAP-12: stock_audit_lines frozen unless session is open ───
CREATE OR REPLACE FUNCTION public.guard_audit_line_status()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.stock_audit_sessions
   WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Audit lines can only be changed while the session is open (current: %)', v_status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_audit_line_status ON public.stock_audit_lines;
CREATE TRIGGER trg_guard_audit_line_status
  BEFORE INSERT OR UPDATE OR DELETE ON public.stock_audit_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_audit_line_status();

-- ─── GAP-19: negative-stock floor on medication_inventory ───
CREATE OR REPLACE FUNCTION public.guard_inventory_non_negative()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity_available IS NOT NULL AND NEW.quantity_available < 0 THEN
    RAISE EXCEPTION 'Insufficient stock: quantity_available would go negative';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_inventory_non_negative ON public.medication_inventory;
CREATE TRIGGER trg_guard_inventory_non_negative
  BEFORE INSERT OR UPDATE OF quantity_available ON public.medication_inventory
  FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_non_negative();
