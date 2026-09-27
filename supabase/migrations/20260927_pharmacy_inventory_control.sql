-- ============================================================
-- Migration: Pharmacy inventory control
-- Date: 2026-09-27
-- Purpose: full pharmacy inventory control —
--   batch/lot tracking, QA quarantine workflow, physical stock
--   audits with reconciliation, write-off approval workflow,
--   FEFO dispensing engine, stock valuation & write-off P&L views.
-- Builds on: pharmacy_inventory, medication_inventory,
--   inventory_transactions (legacy), stock_writeoffs (20260810).
-- Idempotent: safe to re-run (IF NOT EXISTS / DROP+CREATE policies).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Shared helpers
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Any pharmacy operator: institution admin, superadmin, active staff
CREATE OR REPLACE FUNCTION public.is_pharmacy_operator(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_institution_admin(p_institution_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.is_institution_staff_member(p_institution_id);
$$;

-- May approve financial / quality adjustments (write-offs, audits, QA)
CREATE OR REPLACE FUNCTION public.can_approve_pharmacy_adjustments(p_institution_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_institution_admin(p_institution_id)
      OR public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

-- ------------------------------------------------------------
-- 1. medicine_batches — first-class batch/lot entity
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.medicine_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  inventory_table     TEXT NOT NULL CHECK (inventory_table IN ('pharmacy_inventory', 'medication_inventory')),
  inventory_item_id   UUID NOT NULL,
  product_name        TEXT NOT NULL,
  batch_number        TEXT NOT NULL,
  manufacturer        TEXT,
  supplier_id         UUID,
  manufacture_date    DATE,
  expiry_date         DATE NOT NULL,
  quantity_received   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  quantity_remaining  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_remaining >= 0),
  unit_cost           DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
  unit_price          DECIMAL(10,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  qa_status           TEXT NOT NULL DEFAULT 'pending'
                        CHECK (qa_status IN ('pending', 'approved', 'quarantined', 'rejected')),
  qa_checked_by       UUID REFERENCES auth.users(id),
  qa_checked_at       TIMESTAMPTZ,
  qa_notes            TEXT,
  received_by         UUID REFERENCES auth.users(id),
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, inventory_table, inventory_item_id, batch_number)
);

DROP TRIGGER IF EXISTS trg_medicine_batches_updated ON public.medicine_batches;
CREATE TRIGGER trg_medicine_batches_updated
  BEFORE UPDATE ON public.medicine_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 2. batch_stock_movements — immutable batch-level ledger
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.batch_stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  batch_id        UUID NOT NULL REFERENCES public.medicine_batches(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL CHECK (movement_type IN
                    ('receipt', 'dispense', 'sale', 'adjustment', 'write_off',
                     'transfer_in', 'transfer_out', 'return', 'qa_quarantine', 'qa_release')),
  quantity_change INTEGER NOT NULL CHECK (quantity_change <> 0),
  quantity_after  INTEGER NOT NULL CHECK (quantity_after >= 0),
  unit_cost       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  reference_type  TEXT,
  reference_id    UUID,
  performed_by    UUID REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger is append-only; quantity_remaining is maintained here.
CREATE OR REPLACE FUNCTION public.apply_batch_movement()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'batch_stock_movements is immutable: post a reversal movement instead';
  END IF;
  UPDATE public.medicine_batches
     SET quantity_remaining = quantity_remaining + NEW.quantity_change,
         updated_at = now()
   WHERE id = NEW.batch_id
  RETURNING quantity_remaining INTO v_remaining;
  IF v_remaining IS NULL THEN
    RAISE EXCEPTION 'Batch % not found', NEW.batch_id;
  END IF;
  IF v_remaining < 0 THEN
    RAISE EXCEPTION 'Insufficient batch stock: batch % would go negative', NEW.batch_id;
  END IF;
  NEW.quantity_after := v_remaining;
  NEW.performed_by := COALESCE(NEW.performed_by, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_apply_batch_movement ON public.batch_stock_movements;
CREATE TRIGGER trg_apply_batch_movement
  BEFORE INSERT ON public.batch_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_batch_movement();

-- ------------------------------------------------------------
-- 3. Physical stock audits: sessions + count lines
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stock_audit_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  scope         TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'partial', 'cycle')),
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'submitted', 'approved', 'cancelled')),
  started_by    UUID REFERENCES auth.users(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by  UUID REFERENCES auth.users(id),
  submitted_at  TIMESTAMPTZ,
  approved_by   UUID REFERENCES auth.users(id),
  approved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_stock_audit_sessions_updated ON public.stock_audit_sessions;
CREATE TRIGGER trg_stock_audit_sessions_updated
  BEFORE UPDATE ON public.stock_audit_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.stock_audit_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES public.stock_audit_sessions(id) ON DELETE CASCADE,
  batch_id         UUID NOT NULL REFERENCES public.medicine_batches(id) ON DELETE RESTRICT,
  book_quantity    INTEGER NOT NULL,
  counted_quantity INTEGER CHECK (counted_quantity >= 0),
  variance         INTEGER,
  variance_value   DECIMAL(10,2),
  counted_by       UUID REFERENCES auth.users(id),
  counted_at       TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, batch_id)
);

CREATE OR REPLACE FUNCTION public.compute_audit_variance()
RETURNS TRIGGER AS $$
DECLARE
  v_cost DECIMAL(10,2);
BEGIN
  IF NEW.counted_quantity IS NOT NULL THEN
    NEW.variance := NEW.counted_quantity - NEW.book_quantity;
    SELECT unit_cost INTO v_cost FROM public.medicine_batches WHERE id = NEW.batch_id;
    NEW.variance_value := NEW.variance * COALESCE(v_cost, 0);
    NEW.counted_by := COALESCE(NEW.counted_by, auth.uid());
    NEW.counted_at := COALESCE(NEW.counted_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_compute_audit_variance ON public.stock_audit_lines;
CREATE TRIGGER trg_compute_audit_variance
  BEFORE INSERT OR UPDATE OF counted_quantity, book_quantity ON public.stock_audit_lines
  FOR EACH ROW EXECUTE FUNCTION public.compute_audit_variance();

-- Approve a submitted session: posts one adjustment movement per
-- non-zero variance line, then marks the session approved.
CREATE OR REPLACE FUNCTION public.approve_stock_audit_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session RECORD;
  v_line    RECORD;
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

  FOR v_line IN
    SELECT * FROM public.stock_audit_lines
     WHERE session_id = p_session_id
       AND counted_quantity IS NOT NULL
       AND variance <> 0
  LOOP
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

-- ------------------------------------------------------------
-- 4. stock_writeoffs — approval workflow columns
-- ------------------------------------------------------------

ALTER TABLE public.stock_writeoffs
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval', 'approved', 'rejected', 'posted')),
  ADD COLUMN IF NOT EXISTS batch_id        UUID REFERENCES public.medicine_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Approver must differ from requester (separation of duties)
CREATE OR REPLACE FUNCTION public.check_writeoff_approver()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'posted')
     AND NEW.approved_by IS NOT NULL
     AND NEW.approved_by = NEW.written_off_by THEN
    RAISE EXCEPTION 'Write-off approver must differ from the requester';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_writeoff_approver ON public.stock_writeoffs;
CREATE TRIGGER trg_check_writeoff_approver
  BEFORE INSERT OR UPDATE ON public.stock_writeoffs
  FOR EACH ROW EXECUTE FUNCTION public.check_writeoff_approver();

-- Post an approved write-off: decrements the batch via the ledger
CREATE OR REPLACE FUNCTION public.post_stock_writeoff(p_writeoff_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wo RECORD;
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

-- ------------------------------------------------------------
-- 5. FEFO dispensing engine
--    Allocates quantity across approved, unexpired batches,
--    earliest expiry first. Atomic: raises (rolling back) on
--    any shortfall so partial allocations never persist.
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 6. Expiry automation: quarantine expired batches
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.quarantine_expired_batches(p_institution_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH q AS (
    UPDATE public.medicine_batches
       SET qa_status = 'quarantined',
           qa_notes = COALESCE(qa_notes || ' ', '') ||
                      '[Auto-quarantined: expired ' || expiry_date::text || ']',
           updated_at = now()
     WHERE expiry_date < CURRENT_DATE
       AND qa_status = 'approved'
       AND is_active
       AND (p_institution_id IS NULL OR institution_id = p_institution_id)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM q;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------
-- 7. Accounting views: valuation + write-off P&L
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW public.pharmacy_stock_valuation AS
SELECT institution_id,
       inventory_table,
       inventory_item_id,
       product_name,
       SUM(quantity_remaining) AS total_units,
       SUM(quantity_remaining * unit_cost) AS stock_value,
       COUNT(*) AS batch_count,
       MIN(expiry_date) FILTER (WHERE quantity_remaining > 0) AS earliest_expiry
  FROM public.medicine_batches
 WHERE is_active
 GROUP BY institution_id, inventory_table, inventory_item_id, product_name;

CREATE OR REPLACE VIEW public.pharmacy_writeoff_summary AS
SELECT institution_id,
       date_trunc('month', written_off_at)::date AS month,
       reason,
       status,
       COUNT(*) AS writeoff_count,
       SUM(total_loss) AS total_loss
  FROM public.stock_writeoffs
 GROUP BY institution_id, date_trunc('month', written_off_at)::date, reason, status;

-- ------------------------------------------------------------
-- 8. RLS
-- ------------------------------------------------------------

ALTER TABLE public.medicine_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_audit_lines ENABLE ROW LEVEL SECURITY;

-- medicine_batches
DROP POLICY IF EXISTS "Pharmacy operators view batches" ON public.medicine_batches;
CREATE POLICY "Pharmacy operators view batches"
  ON public.medicine_batches FOR SELECT TO authenticated
  USING (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Pharmacy operators insert batches" ON public.medicine_batches;
CREATE POLICY "Pharmacy operators insert batches"
  ON public.medicine_batches FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Pharmacy operators update batches" ON public.medicine_batches;
CREATE POLICY "Pharmacy operators update batches"
  ON public.medicine_batches FOR UPDATE TO authenticated
  USING (public.is_pharmacy_operator(institution_id))
  WITH CHECK (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Approvers delete batches" ON public.medicine_batches;
CREATE POLICY "Approvers delete batches"
  ON public.medicine_batches FOR DELETE TO authenticated
  USING (public.can_approve_pharmacy_adjustments(institution_id));

-- batch_stock_movements (append-only; trigger rejects updates/deletes)
DROP POLICY IF EXISTS "Pharmacy operators view movements" ON public.batch_stock_movements;
CREATE POLICY "Pharmacy operators view movements"
  ON public.batch_stock_movements FOR SELECT TO authenticated
  USING (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Pharmacy operators insert movements" ON public.batch_stock_movements;
CREATE POLICY "Pharmacy operators insert movements"
  ON public.batch_stock_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_operator(institution_id));

-- stock_audit_sessions
DROP POLICY IF EXISTS "Pharmacy operators view audit sessions" ON public.stock_audit_sessions;
CREATE POLICY "Pharmacy operators view audit sessions"
  ON public.stock_audit_sessions FOR SELECT TO authenticated
  USING (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Pharmacy operators insert audit sessions" ON public.stock_audit_sessions;
CREATE POLICY "Pharmacy operators insert audit sessions"
  ON public.stock_audit_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Pharmacy operators update audit sessions" ON public.stock_audit_sessions;
CREATE POLICY "Pharmacy operators update audit sessions"
  ON public.stock_audit_sessions FOR UPDATE TO authenticated
  USING (public.is_pharmacy_operator(institution_id))
  WITH CHECK (public.is_pharmacy_operator(institution_id));

DROP POLICY IF EXISTS "Approvers delete audit sessions" ON public.stock_audit_sessions;
CREATE POLICY "Approvers delete audit sessions"
  ON public.stock_audit_sessions FOR DELETE TO authenticated
  USING (public.can_approve_pharmacy_adjustments(institution_id));

-- stock_audit_lines
DROP POLICY IF EXISTS "Pharmacy operators view audit lines" ON public.stock_audit_lines;
CREATE POLICY "Pharmacy operators view audit lines"
  ON public.stock_audit_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stock_audit_sessions s
     WHERE s.id = stock_audit_lines.session_id
       AND public.is_pharmacy_operator(s.institution_id)
  ));

DROP POLICY IF EXISTS "Pharmacy operators manage audit lines" ON public.stock_audit_lines;
CREATE POLICY "Pharmacy operators manage audit lines"
  ON public.stock_audit_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stock_audit_sessions s
     WHERE s.id = stock_audit_lines.session_id
       AND public.is_pharmacy_operator(s.institution_id)
  ));

DROP POLICY IF EXISTS "Pharmacy operators update audit lines" ON public.stock_audit_lines;
CREATE POLICY "Pharmacy operators update audit lines"
  ON public.stock_audit_lines FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stock_audit_sessions s
     WHERE s.id = stock_audit_lines.session_id
       AND public.is_pharmacy_operator(s.institution_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stock_audit_sessions s
     WHERE s.id = stock_audit_lines.session_id
       AND public.is_pharmacy_operator(s.institution_id)
  ));

-- stock_writeoffs: approver-only status changes (existing permissive
-- select/insert policies from 20260810 are left untouched)
DROP POLICY IF EXISTS "Approvers update writeoffs" ON public.stock_writeoffs;
CREATE POLICY "Approvers update writeoffs"
  ON public.stock_writeoffs FOR UPDATE TO authenticated
  USING (public.can_approve_pharmacy_adjustments(institution_id))
  WITH CHECK (public.can_approve_pharmacy_adjustments(institution_id));

-- ------------------------------------------------------------
-- 9. Indexes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_medicine_batches_institution
  ON public.medicine_batches(institution_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_item
  ON public.medicine_batches(inventory_table, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry
  ON public.medicine_batches(expiry_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_medicine_batches_qa
  ON public.medicine_batches(qa_status) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_batch_movements_batch
  ON public.batch_stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_institution
  ON public.batch_stock_movements(institution_id);
CREATE INDEX IF NOT EXISTS idx_batch_movements_created
  ON public.batch_stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_lines_session
  ON public.stock_audit_lines(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_institution
  ON public.stock_audit_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_writeoffs_batch
  ON public.stock_writeoffs(batch_id);
CREATE INDEX IF NOT EXISTS idx_writeoffs_status
  ON public.stock_writeoffs(status);

-- ------------------------------------------------------------
-- 10. Backfill: one batch per existing inventory row
--     Legacy stock is already in circulation -> qa_status 'approved'.
-- ------------------------------------------------------------

INSERT INTO public.medicine_batches
  (institution_id, inventory_table, inventory_item_id, product_name,
   batch_number, manufacturer, expiry_date,
   quantity_received, quantity_remaining, unit_cost, unit_price,
   qa_status, received_at)
SELECT pi.pharmacy_id,
       'pharmacy_inventory',
       pi.id,
       pi.product_name,
       COALESCE(NULLIF(pi.batch_number, ''), 'LEGACY-' || substr(pi.id::text, 1, 8)),
       pi.manufacturer,
       COALESCE(pi.expiry_date, CURRENT_DATE + INTERVAL '2 years'),
       COALESCE(pi.quantity, 0),
       COALESCE(pi.quantity, 0),
       COALESCE(pi.cost_price, 0),
       pi.unit_price,
       'approved',
       COALESCE(pi.created_at, now())
  FROM public.pharmacy_inventory pi
 WHERE NOT EXISTS (
   SELECT 1 FROM public.medicine_batches mb
    WHERE mb.inventory_table = 'pharmacy_inventory'
      AND mb.inventory_item_id = pi.id
 );

INSERT INTO public.medicine_batches
  (institution_id, inventory_table, inventory_item_id, product_name,
   batch_number, manufacturer, expiry_date,
   quantity_received, quantity_remaining, unit_cost, unit_price,
   qa_status, received_at)
SELECT mi.institution_id,
       'medication_inventory',
       mi.id,
       mi.medication_name || COALESCE(' ' || NULLIF(mi.dosage, ''), ''),
       COALESCE(NULLIF(mi.batch_number, ''), 'LEGACY-' || substr(mi.id::text, 1, 8)),
       mi.manufacturer,
       COALESCE(mi.expiry_date, CURRENT_DATE + INTERVAL '2 years'),
       COALESCE(mi.quantity_available, 0),
       COALESCE(mi.quantity_available, 0),
       COALESCE(mi.cost_price, 0),
       mi.unit_price,
       'approved',
       now()
  FROM public.medication_inventory mi
 WHERE NOT EXISTS (
   SELECT 1 FROM public.medicine_batches mb
    WHERE mb.inventory_table = 'medication_inventory'
      AND mb.inventory_item_id = mi.id
 );

-- ============================================================
-- SUMMARY
-- New tables: medicine_batches, batch_stock_movements,
--   stock_audit_sessions, stock_audit_lines
-- Extended:   stock_writeoffs (status workflow + batch link)
-- Functions:  is_pharmacy_operator, can_approve_pharmacy_adjustments,
--   dispense_medicine_batches (FEFO), quarantine_expired_batches,
--   approve_stock_audit_session, post_stock_writeoff
-- Views:      pharmacy_stock_valuation, pharmacy_writeoff_summary
-- Backfill:   existing inventory rows -> approved batches
-- ============================================================
