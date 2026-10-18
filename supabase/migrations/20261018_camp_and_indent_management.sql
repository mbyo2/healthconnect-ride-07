-- ============================================================================
-- Camp Management + Indent Management (MocDoc parity, CEO decision 2026-10-18)
--
-- MODULE 1 — HEALTH CAMPS (outreach: screening, vaccination, eye, dental)
--   health_camps: a camp event run by an institution.
--   camp_registrations: on-site registrations incl. walk-ins (patient_id
--     nullable). Screening results stored as JSONB. "Sync to EHR" links a
--     registration to a registered patient by phone when one exists; the
--     registration row itself is the clinical record otherwise.
--
-- MODULE 2 — INDENTS (department supply requests -> pharmacy/store)
--   indents: a supply request raised by a department.
--   indent_items: line items with requested / approved / issued quantities,
--     supporting partial approval and partial fulfillment.
--
-- SECURITY MODEL:
--   All four tables are institution-scoped. Staff of the owning institution
--   (via public.is_institution_staff_member) get full access. Cross-table
--   checks (registrations -> camp, items -> indent) go through SECURITY
--   DEFINER helpers — never inline EXISTS in a policy (RLS recursion rule).
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. health_camps
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  camp_date DATE NOT NULL,
  camp_type TEXT NOT NULL DEFAULT 'general'
    CHECK (camp_type IN ('screening','vaccination','eye','dental','general','maternal','hiv_testing')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','cancelled')),
  target_population INTEGER CHECK (target_population IS NULL OR target_population > 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_camps_institution ON public.health_camps(institution_id);
CREATE INDEX IF NOT EXISTS idx_health_camps_status ON public.health_camps(status);
CREATE INDEX IF NOT EXISTS idx_health_camps_date ON public.health_camps(camp_date);

ALTER TABLE public.health_camps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff manage health camps" ON public.health_camps;
CREATE POLICY "Institution staff manage health camps"
ON public.health_camps FOR ALL TO authenticated
USING (public.is_institution_staff_member(institution_id))
WITH CHECK (public.is_institution_staff_member(institution_id));

DROP TRIGGER IF EXISTS trg_health_camps_updated_at ON public.health_camps;
CREATE TRIGGER trg_health_camps_updated_at
  BEFORE UPDATE ON public.health_camps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 2. camp_registrations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.camp_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.health_camps(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  age INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 130)),
  gender TEXT CHECK (gender IS NULL OR gender IN ('male','female','other')),
  screening_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  referral_needed BOOLEAN NOT NULL DEFAULT false,
  referred_to TEXT,
  follow_up_date DATE,
  follow_up_done BOOLEAN NOT NULL DEFAULT false,
  synced_to_ehr BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camp_registrations_camp ON public.camp_registrations(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_phone ON public.camp_registrations(phone);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_referral ON public.camp_registrations(referral_needed) WHERE referral_needed = true;
CREATE INDEX IF NOT EXISTS idx_camp_registrations_followup ON public.camp_registrations(follow_up_date) WHERE follow_up_done = false;

ALTER TABLE public.camp_registrations ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: is the caller staff of the camp's institution?
CREATE OR REPLACE FUNCTION public.is_camp_staff(p_camp_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_institution_staff_member(
    (SELECT institution_id FROM public.health_camps WHERE id = p_camp_id)
  );
$$;

DROP POLICY IF EXISTS "Institution staff manage camp registrations" ON public.camp_registrations;
CREATE POLICY "Institution staff manage camp registrations"
ON public.camp_registrations FOR ALL TO authenticated
USING (public.is_camp_staff(camp_id))
WITH CHECK (public.is_camp_staff(camp_id));

-- --------------------------------------------------------------------------
-- 3. indents
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_number TEXT UNIQUE NOT NULL,
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','partially_fulfilled','fulfilled','rejected','cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('routine','urgent','emergency')),
  notes TEXT,
  rejection_reason TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indents_institution ON public.indents(institution_id);
CREATE INDEX IF NOT EXISTS idx_indents_status ON public.indents(status);
CREATE INDEX IF NOT EXISTS idx_indents_priority ON public.indents(priority);

ALTER TABLE public.indents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff manage indents" ON public.indents;
CREATE POLICY "Institution staff manage indents"
ON public.indents FOR ALL TO authenticated
USING (public.is_institution_staff_member(institution_id))
WITH CHECK (public.is_institution_staff_member(institution_id));

DROP TRIGGER IF EXISTS trg_indents_updated_at ON public.indents;
CREATE TRIGGER trg_indents_updated_at
  BEFORE UPDATE ON public.indents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------------------------------------------------------
-- 4. indent_items
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.indent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indent_id UUID NOT NULL REFERENCES public.indents(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_approved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_approved >= 0),
  quantity_issued INTEGER NOT NULL DEFAULT 0 CHECK (quantity_issued >= 0),
  unit TEXT NOT NULL DEFAULT 'units',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_indent_items_indent ON public.indent_items(indent_id);

ALTER TABLE public.indent_items ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER helper: is the caller staff of the indent's institution?
CREATE OR REPLACE FUNCTION public.is_indent_staff(p_indent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.is_institution_staff_member(
    (SELECT institution_id FROM public.indents WHERE id = p_indent_id)
  );
$$;

DROP POLICY IF EXISTS "Institution staff manage indent items" ON public.indent_items;
CREATE POLICY "Institution staff manage indent items"
ON public.indent_items FOR ALL TO authenticated
USING (public.is_indent_staff(indent_id))
WITH CHECK (public.is_indent_staff(indent_id));

-- --------------------------------------------------------------------------
-- 5. Charter module keys (grant/revoke via InstitutionModuleManager)
-- --------------------------------------------------------------------------
INSERT INTO public.facility_module_charter (tier, module_key, module_name, description, status, display_order)
VALUES
  ('primary','camp_management','Health Camp Outreach','Community health camps: registration, screening, referrals and follow-up','planned',14),
  ('secondary','camp_management','Health Camp Outreach','Community health camps: registration, screening, referrals and follow-up','planned',24),
  ('tertiary','camp_management','Health Camp Outreach','Community health camps: registration, screening, referrals and follow-up','planned',28),
  ('primary','indent_management','Indent Management','Department supply requests with pharmacy approval and fulfillment','planned',15),
  ('secondary','indent_management','Indent Management','Department supply requests with pharmacy approval and fulfillment','planned',25),
  ('tertiary','indent_management','Indent Management','Department supply requests with pharmacy approval and fulfillment','planned',29)
ON CONFLICT DO NOTHING;
