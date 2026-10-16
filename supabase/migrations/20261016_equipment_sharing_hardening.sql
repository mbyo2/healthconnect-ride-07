-- ============================================================================
-- Equipment sharing network — hardening (defense in depth).
-- Applies on top of 20261016_equipment_sharing_network.sql.
--
--  1. requested_by must be the caller (no forged attribution).
--  2. owner_institution_id must be the asset's real owner (no misrouting).
--  3. decided_by must be the caller on owner decisions.
--  4. Immutable core columns via trigger (asset/requester/owner/requested_by
--     can never be rewritten after insert).
--  5. Status state-machine via trigger (no resurrecting terminal requests).
--  6. One pending request per asset per institution (anti-spam).
-- ============================================================================

-- Helper: asset's owning institution (SECURITY DEFINER so RLS policies can
-- use it without tripping asset_register's staff-only SELECT policy).
CREATE OR REPLACE FUNCTION public.asset_owner_institution(p_asset_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT institution_id FROM public.asset_register WHERE id = p_asset_id;
$$;

-- 1+2. Tighten INSERT: caller attribution + real owner match
DROP POLICY IF EXISTS "Staff can request shared equipment" ON public.equipment_share_requests;
CREATE POLICY "Staff can request shared equipment"
ON public.equipment_share_requests FOR INSERT TO authenticated
WITH CHECK (
  public.is_institution_staff_member(requester_institution_id)
  AND requested_by = auth.uid()
  AND public.is_asset_shareable(asset_id)
  AND owner_institution_id = public.asset_owner_institution(asset_id)
  AND owner_institution_id <> requester_institution_id
  AND status = 'pending'
);

-- 3. Tighten owner UPDATE: decisions attributed to the caller
DROP POLICY IF EXISTS "Owners decide share requests" ON public.equipment_share_requests;
CREATE POLICY "Owners decide share requests"
ON public.equipment_share_requests FOR UPDATE TO authenticated
USING (public.is_institution_staff_member(owner_institution_id))
WITH CHECK (
  public.is_institution_staff_member(owner_institution_id)
  AND decided_by = auth.uid()
);

-- 4+5. Trigger: immutable core columns + status state machine
CREATE OR REPLACE FUNCTION public.enforce_share_request_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  allowed BOOLEAN;
BEGIN
  -- Core columns are immutable after insert
  IF OLD.asset_id IS DISTINCT FROM NEW.asset_id
     OR OLD.owner_institution_id IS DISTINCT FROM NEW.owner_institution_id
     OR OLD.requester_institution_id IS DISTINCT FROM NEW.requester_institution_id
     OR OLD.requested_by IS DISTINCT FROM NEW.requested_by THEN
    RAISE EXCEPTION 'Share request core fields are immutable';
  END IF;

  -- Status state machine
  allowed := CASE OLD.status
    WHEN 'pending'   THEN NEW.status IN ('pending','approved','declined','cancelled')
    WHEN 'approved'  THEN NEW.status IN ('approved','completed','cancelled')
    WHEN 'declined'  THEN NEW.status = 'declined'
    WHEN 'cancelled' THEN NEW.status = 'cancelled'
    WHEN 'completed' THEN NEW.status = 'completed'
    ELSE FALSE
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid share request status transition % -> %', OLD.status, NEW.status;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_share_request_integrity ON public.equipment_share_requests;
CREATE TRIGGER trg_share_request_integrity
BEFORE UPDATE ON public.equipment_share_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_share_request_integrity();

-- 6. One pending request per asset per requesting institution (anti-spam)
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_req_pending
ON public.equipment_share_requests(asset_id, requester_institution_id)
WHERE status = 'pending';
