-- ============================================================
-- Doc'O Clock — Blood Bank atomic issuance + audit trail
--
-- Problem found 2026-10-01 during end-to-end Blood Bank testing:
-- 1. The "New Request" form did not collect patient_id, so transfusion
--    requests were not linked to patients.
-- 2. Issuing blood (status → 'issued') only updated the request row;
--    inventory was NOT decremented, and there was no atomicity —
--    a failure mid-way would leave inconsistent state.
-- 3. No audit trail of who issued what to whom.
--
-- This migration:
-- - Creates public.blood_bank_audit for the issuance audit trail
-- - Creates public.issue_blood() RPC: atomically (single transaction)
--   validates stock, decrements inventory, marks request issued,
--   and writes the audit record. Any failure rolls back everything.
-- Idempotent; safe to re-run.
-- ============================================================

-- ─── 1. Audit table ───
CREATE TABLE IF NOT EXISTS public.blood_bank_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID NOT NULL,
  request_id      UUID REFERENCES public.blood_bank_requests(id) ON DELETE SET NULL,
  patient_id      UUID,
  blood_type      TEXT NOT NULL,
  component_type  TEXT NOT NULL,
  units_issued    INTEGER NOT NULL,
  issued_by       UUID NOT NULL,
  issued_at       TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  action          TEXT NOT NULL DEFAULT 'issued',
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blood_bank_audit_hospital ON public.blood_bank_audit(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_bank_audit_request ON public.blood_bank_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_blood_bank_audit_patient ON public.blood_bank_audit(patient_id);

ALTER TABLE public.blood_bank_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users access blood bank audit" ON public.blood_bank_audit;
CREATE POLICY "Authenticated users access blood bank audit"
  ON public.blood_bank_audit FOR ALL TO authenticated USING (true);

-- ─── 2. Atomic issuance RPC ───
-- Issues blood for a request: checks stock, decrements inventory,
-- marks request issued, writes audit — all atomically.
CREATE OR REPLACE FUNCTION public.issue_blood(
  p_request_id UUID,
  p_issued_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_inventory RECORD;
  v_issued_by UUID;
  v_audit_id UUID;
BEGIN
  v_issued_by := COALESCE(p_issued_by, auth.uid());
  IF v_issued_by IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the request row.
  SELECT * INTO v_request
  FROM public.blood_bank_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request not found';
  END IF;

  IF v_request.status = 'issued' THEN
    RAISE EXCEPTION 'Blood request already issued';
  END IF;

  IF v_request.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot issue a cancelled request';
  END IF;

  IF v_request.patient_id IS NULL THEN
    RAISE EXCEPTION 'Cannot issue blood: request has no linked patient';
  END IF;

  -- Authorization: caller must have blood-bank access to this institution.
  IF NOT public.can_access_institution_blood_bank(v_request.hospital_id) THEN
    RAISE EXCEPTION 'Not authorized for this institution''s blood bank';
  END IF;

  -- Lock the matching inventory row (blood_type/component_type/hospital).
  -- The live inventory uses blood_type; fall back to blood_group for legacy rows.
  SELECT * INTO v_inventory
  FROM public.blood_bank_inventory
  WHERE hospital_id = v_request.hospital_id
    AND (
      (blood_type IS NOT NULL AND blood_type = v_request.blood_type)
      OR (blood_group IS NOT NULL AND blood_group = COALESCE(v_request.blood_type, v_request.blood_group))
    )
    AND lower(component_type) = lower(COALESCE(v_request.component_type, 'whole_blood'))
  ORDER BY expiry_date ASC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No inventory available for % %', v_request.blood_type, v_request.component_type;
  END IF;

  IF v_inventory.units_available < v_request.units_required THEN
    RAISE EXCEPTION 'Insufficient stock: % units available, % required',
      v_inventory.units_available, v_request.units_required;
  END IF;

  -- Decrement inventory atomically.
  UPDATE public.blood_bank_inventory
  SET units_available = units_available - v_request.units_required,
      updated_at = now()
  WHERE id = v_inventory.id;

  -- Mark request issued.
  UPDATE public.blood_bank_requests
  SET status = 'issued',
      issued_date = now(),
      updated_at = now()
  WHERE id = v_request.id;

  -- Audit trail.
  INSERT INTO public.blood_bank_audit (
    hospital_id, request_id, patient_id,
    blood_type, component_type, units_issued,
    issued_by, action, notes
  ) VALUES (
    v_request.hospital_id, v_request.id, v_request.patient_id,
    v_request.blood_type, v_request.component_type, v_request.units_required,
    v_issued_by, 'issued', p_notes
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Restrict execute to authenticated users (RLS-style authz is inside the function).
REVOKE ALL ON FUNCTION public.issue_blood(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_blood(UUID, UUID, TEXT) TO authenticated;
