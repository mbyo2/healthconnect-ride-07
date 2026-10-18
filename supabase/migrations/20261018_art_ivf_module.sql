-- ART/IVF fertility module: confidential treatment cycles and procedures.
-- Access is STRICTLY limited: only explicitly assigned staff members and the
-- patient (and partner) can read a cycle. No institution-wide visibility.

CREATE TABLE IF NOT EXISTS public.art_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  partner_patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  cycle_type TEXT NOT NULL CHECK (cycle_type IN ('IVF', 'IUI', 'ICSI', 'FET')),
  status TEXT NOT NULL DEFAULT 'consultation'
    CHECK (status IN ('consultation', 'stimulation', 'retrieval', 'fertilization', 'transfer', 'waiting', 'completed', 'cancelled')),
  start_date DATE,
  notes TEXT,
  confidentiality_level TEXT NOT NULL DEFAULT 'restricted'
    CHECK (confidentiality_level IN ('restricted', 'standard')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.art_cycle_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.art_cycles(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'clinician',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.art_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.art_cycles(id) ON DELETE CASCADE,
  procedure_type TEXT NOT NULL,
  procedure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  outcome TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_cycles_institution ON public.art_cycles(institution_id);
CREATE INDEX IF NOT EXISTS idx_art_cycles_patient ON public.art_cycles(patient_id);
CREATE INDEX IF NOT EXISTS idx_art_cycles_status ON public.art_cycles(status);
CREATE INDEX IF NOT EXISTS idx_art_cycle_staff_cycle ON public.art_cycle_staff(cycle_id);
CREATE INDEX IF NOT EXISTS idx_art_cycle_staff_staff ON public.art_cycle_staff(staff_id);
CREATE INDEX IF NOT EXISTS idx_art_procedures_cycle ON public.art_procedures(cycle_id);

ALTER TABLE public.art_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_cycle_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_procedures ENABLE ROW LEVEL SECURITY;

-- Helper: SECURITY DEFINER so RLS policies never recurse.
CREATE OR REPLACE FUNCTION public.can_access_art_cycle(p_cycle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.art_cycles c
    WHERE c.id = p_cycle_id
      AND (
        c.patient_id = auth.uid()
        OR c.partner_patient_id = auth.uid()
        OR c.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.art_cycle_staff s
          WHERE s.cycle_id = c.id AND s.staff_id = auth.uid()
        )
      )
  );
$$;

-- art_cycles: read only for patient, partner, creator, assigned staff.
DROP POLICY IF EXISTS "ART cycle strict read" ON public.art_cycles;
CREATE POLICY "ART cycle strict read"
ON public.art_cycles FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR partner_patient_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.art_cycle_staff s
    WHERE s.cycle_id = art_cycles.id AND s.staff_id = auth.uid()
  )
);

-- art_cycles: insert by authenticated staff (creator auto-assigns self).
DROP POLICY IF EXISTS "ART cycle create" ON public.art_cycles;
CREATE POLICY "ART cycle create"
ON public.art_cycles FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- art_cycles: update only for assigned staff + creator.
DROP POLICY IF EXISTS "ART cycle update" ON public.art_cycles;
CREATE POLICY "ART cycle update"
ON public.art_cycles FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.art_cycle_staff s
    WHERE s.cycle_id = art_cycles.id AND s.staff_id = auth.uid()
  )
);

-- art_cycle_staff: readable by anyone who can read the cycle; manageable by
-- the cycle creator or already-assigned staff.
DROP POLICY IF EXISTS "ART staff read" ON public.art_cycle_staff;
CREATE POLICY "ART staff read"
ON public.art_cycle_staff FOR SELECT TO authenticated
USING (public.can_access_art_cycle(cycle_id));

DROP POLICY IF EXISTS "ART staff manage" ON public.art_cycle_staff;
CREATE POLICY "ART staff manage"
ON public.art_cycle_staff FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.art_cycles c
    WHERE c.id = art_cycle_staff.cycle_id
      AND (c.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.art_cycle_staff s2
                   WHERE s2.cycle_id = c.id AND s2.staff_id = auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.art_cycles c
    WHERE c.id = art_cycle_staff.cycle_id
      AND (c.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.art_cycle_staff s2
                   WHERE s2.cycle_id = c.id AND s2.staff_id = auth.uid()))
  )
);

-- art_procedures: same strict read as cycles.
DROP POLICY IF EXISTS "ART procedure strict read" ON public.art_procedures;
CREATE POLICY "ART procedure strict read"
ON public.art_procedures FOR SELECT TO authenticated
USING (public.can_access_art_cycle(cycle_id));

DROP POLICY IF EXISTS "ART procedure write" ON public.art_procedures;
CREATE POLICY "ART procedure write"
ON public.art_procedures FOR ALL TO authenticated
USING (public.can_access_art_cycle(cycle_id))
WITH CHECK (public.can_access_art_cycle(cycle_id));

COMMENT ON TABLE public.art_cycles IS 'Confidential ART/IVF treatment cycles. Strict RLS: only patient, partner, creator, and explicitly assigned staff can read.';
COMMENT ON TABLE public.art_cycle_staff IS 'Staff explicitly assigned to an ART cycle (confidentiality boundary).';
COMMENT ON TABLE public.art_procedures IS 'Procedures logged against an ART cycle; inherits cycle confidentiality.';
