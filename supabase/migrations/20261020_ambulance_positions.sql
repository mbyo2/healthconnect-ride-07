-- Ambulance live positions (audit fix, Cluster C, 2026-10-20)
--
-- Problem: ambulance dispatch had pickup/destination coordinates on
-- ambulance_dispatches but NO vehicle position feed — dispatch was a
-- manual status board only, nothing ever recorded where the unit is.
--
-- This adds the position history table. Crew devices publish while a
-- dispatch is en_route / on_scene / transporting; the dispatch board
-- reads the latest row per dispatch.
--
-- RLS mirrors the final ambulance_dispatches policies
-- (20260308223350 "Scoped ambulance dispatch access/manage"): a position
-- is visible/writable exactly when its parent dispatch is accessible to
-- the caller — crew lead, dispatcher, institution staff member, platform
-- admin/super_admin, or service role.

CREATE TABLE IF NOT EXISTS public.ambulance_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.ambulance_dispatches(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy_m DOUBLE PRECISION,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ambulance_positions_dispatch
  ON public.ambulance_positions(dispatch_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_ambulance_positions_institution
  ON public.ambulance_positions(institution_id, recorded_at DESC)
  WHERE institution_id IS NOT NULL;

ALTER TABLE public.ambulance_positions ENABLE ROW LEVEL SECURITY;

-- Read: same scope as reading the parent dispatch.
DROP POLICY IF EXISTS "Scoped ambulance position access" ON public.ambulance_positions;
CREATE POLICY "Scoped ambulance position access"
ON public.ambulance_positions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ambulance_dispatches d
    WHERE d.id = ambulance_positions.dispatch_id
    AND (
      d.crew_lead_id = auth.uid()
      OR d.dispatcher_id = auth.uid()
      OR (d.institution_id IS NOT NULL AND public.is_institution_staff_member(d.institution_id))
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.is_service_role()
    )
  )
);

-- Write: same scope as managing the parent dispatch (crew devices publish
-- under the account running the dispatch workflow).
DROP POLICY IF EXISTS "Scoped ambulance position manage" ON public.ambulance_positions;
CREATE POLICY "Scoped ambulance position manage"
ON public.ambulance_positions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ambulance_dispatches d
    WHERE d.id = ambulance_positions.dispatch_id
    AND (
      d.crew_lead_id = auth.uid()
      OR d.dispatcher_id = auth.uid()
      OR (d.institution_id IS NOT NULL AND public.is_institution_staff_member(d.institution_id))
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.is_service_role()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ambulance_dispatches d
    WHERE d.id = ambulance_positions.dispatch_id
    AND (
      d.crew_lead_id = auth.uid()
      OR d.dispatcher_id = auth.uid()
      OR (d.institution_id IS NOT NULL AND public.is_institution_staff_member(d.institution_id))
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.is_service_role()
    )
  )
);

-- Live board updates (guarded: no-op if already in the publication).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ambulance_positions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambulance_positions;
  END IF;
END $$;
