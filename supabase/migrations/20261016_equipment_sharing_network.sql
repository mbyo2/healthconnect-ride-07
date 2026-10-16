-- ============================================================================
-- Shared equipment network (MocDoc-style, cross-institution).
-- Institutions can mark operational machines as shareable; other
-- institutions discover them through a safe public view and request usage.
--
-- SECURITY MODEL (defense in depth):
--  1. asset_register keeps its institution-only RLS. Cross-institution
--     visibility goes ONLY through the shareable_equipment VIEW, which
--     whitelists safe columns (no purchase_cost, serial_number, notes)
--     and only exposes machines explicitly marked shareable + operational
--     at verified institutions.
--  2. equipment_share_requests: requesters can only INSERT for their own
--     institution against a shareable asset; only the OWNER institution
--     can approve/decline; requesters may only cancel their own pending
--     requests. No DELETE (the table is the audit trail).
--  3. No self-requests (CHECK constraint).
-- ============================================================================

-- 1. Shareable flags on the asset register
ALTER TABLE public.asset_register
  ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_terms TEXT,
  ADD COLUMN IF NOT EXISTS share_rate NUMERIC(12,2);

-- 2. Share requests between institutions
CREATE TABLE IF NOT EXISTS public.equipment_share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.asset_register(id) ON DELETE CASCADE,
  owner_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  requester_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','declined','cancelled','completed')),
  requested_date DATE,
  purpose TEXT,
  notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_request CHECK (owner_institution_id <> requester_institution_id)
);

CREATE INDEX IF NOT EXISTS idx_share_req_asset ON public.equipment_share_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_share_req_owner ON public.equipment_share_requests(owner_institution_id);
CREATE INDEX IF NOT EXISTS idx_share_req_requester ON public.equipment_share_requests(requester_institution_id);
CREATE INDEX IF NOT EXISTS idx_share_req_status ON public.equipment_share_requests(status);

ALTER TABLE public.equipment_share_requests ENABLE ROW LEVEL SECURITY;

-- Helper: is this asset currently shareable? (SECURITY DEFINER so RLS can use it)
CREATE OR REPLACE FUNCTION public.is_asset_shareable(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.asset_register
    WHERE id = p_asset_id
      AND is_shareable = true
      AND status = 'operational'
  );
$$;

-- SELECT: staff of either side (or platform admin) can read a request
DROP POLICY IF EXISTS "Share request parties can view" ON public.equipment_share_requests;
CREATE POLICY "Share request parties can view"
ON public.equipment_share_requests FOR SELECT TO authenticated
USING (
  public.is_institution_staff_member(owner_institution_id)
  OR public.is_institution_staff_member(requester_institution_id)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- INSERT: only staff of the requesting institution, only against a
-- currently-shareable asset, never to themselves
DROP POLICY IF EXISTS "Staff can request shared equipment" ON public.equipment_share_requests;
CREATE POLICY "Staff can request shared equipment"
ON public.equipment_share_requests FOR INSERT TO authenticated
WITH CHECK (
  public.is_institution_staff_member(requester_institution_id)
  AND public.is_asset_shareable(asset_id)
  AND owner_institution_id <> requester_institution_id
  AND status = 'pending'
);

-- UPDATE: owner institution decides (approve/decline/complete)
DROP POLICY IF EXISTS "Owners decide share requests" ON public.equipment_share_requests;
CREATE POLICY "Owners decide share requests"
ON public.equipment_share_requests FOR UPDATE TO authenticated
USING (public.is_institution_staff_member(owner_institution_id))
WITH CHECK (public.is_institution_staff_member(owner_institution_id));

-- UPDATE: requesters may only cancel their own pending requests
DROP POLICY IF EXISTS "Requesters cancel own pending requests" ON public.equipment_share_requests;
CREATE POLICY "Requesters cancel own pending requests"
ON public.equipment_share_requests FOR UPDATE TO authenticated
USING (
  public.is_institution_staff_member(requester_institution_id)
  AND status = 'pending'
)
WITH CHECK (
  public.is_institution_staff_member(requester_institution_id)
  AND status = 'cancelled'
);

-- No DELETE policy: the request history is the audit trail.

-- 3. Safe public view: shareable machines, whitelisted columns only.
-- Runs with view-owner privileges; the WHERE clause is the enforcement.
CREATE OR REPLACE VIEW public.shareable_equipment AS
SELECT
  a.id,
  a.institution_id,
  hi.name  AS institution_name,
  hi.city  AS institution_city,
  a.asset_name,
  a.asset_tag,
  a.category,
  a.manufacturer,
  a.model_number,
  a.location,
  a.status,
  a.condition,
  a.is_shareable,
  a.share_terms,
  a.share_rate,
  a.next_maintenance_date,
  a.updated_at
FROM public.asset_register a
JOIN public.healthcare_institutions hi ON hi.id = a.institution_id
WHERE a.is_shareable = true
  AND a.status = 'operational'
  AND hi.is_verified = true;

GRANT SELECT ON public.shareable_equipment TO authenticated;

-- 4. Realtime: share requests update both sides instantly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='equipment_share_requests')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='equipment_share_requests') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment_share_requests';
  END IF;
END $$;
