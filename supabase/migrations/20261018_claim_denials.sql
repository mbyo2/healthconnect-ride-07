-- FEATURE 1: Claim Denial Management Workqueues
-- Competitive gap close vs Epic: structured denial workqueue with appeal deadlines,
-- assignment, appeal tracking, and write-off auditing.

CREATE TABLE IF NOT EXISTS public.claim_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.insurance_claims(id) ON DELETE SET NULL,
  denial_code TEXT,
  denial_reason TEXT NOT NULL,
  denied_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','appealed','resolved','written_off')),
  assigned_to UUID REFERENCES auth.users(id),
  appeal_deadline DATE,
  appeal_notes TEXT,
  supporting_documents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_claim_denial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_denials_updated_at ON public.claim_denials;
CREATE TRIGGER trg_claim_denials_updated_at
BEFORE UPDATE ON public.claim_denials
FOR EACH ROW
EXECUTE FUNCTION public.touch_claim_denial_updated_at();

-- Auto-stamp resolved_at when status reaches a terminal state
CREATE OR REPLACE FUNCTION public.stamp_claim_denial_resolved_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('resolved','written_off') AND OLD.status NOT IN ('resolved','written_off') THEN
    NEW.resolved_at = now();
  END IF;
  IF NEW.status NOT IN ('resolved','written_off') THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_denials_resolved_at ON public.claim_denials;
CREATE TRIGGER trg_claim_denials_resolved_at
BEFORE UPDATE ON public.claim_denials
FOR EACH ROW
EXECUTE FUNCTION public.stamp_claim_denial_resolved_at();

-- RLS
ALTER TABLE public.claim_denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff can view claim denials" ON public.claim_denials;
DROP POLICY IF EXISTS "Institution staff can manage claim denials" ON public.claim_denials;

CREATE POLICY "Institution staff can view claim denials"
ON public.claim_denials
FOR SELECT
USING (
  public.is_institution_staff_member(institution_id)
  OR public.is_institution_admin(institution_id)
);

CREATE POLICY "Institution staff can manage claim denials"
ON public.claim_denials
FOR ALL
USING (
  public.is_institution_staff_member(institution_id)
  OR public.is_institution_admin(institution_id)
)
WITH CHECK (
  public.is_institution_staff_member(institution_id)
  OR public.is_institution_admin(institution_id)
);

-- Indexes: workqueue ordering (deadline urgency) + filters
CREATE INDEX IF NOT EXISTS idx_claim_denials_institution_status
ON public.claim_denials (institution_id, status);

CREATE INDEX IF NOT EXISTS idx_claim_denials_institution_deadline
ON public.claim_denials (institution_id, appeal_deadline);

CREATE INDEX IF NOT EXISTS idx_claim_denials_assigned_to
ON public.claim_denials (assigned_to);
