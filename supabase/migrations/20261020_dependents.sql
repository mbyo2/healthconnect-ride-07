-- Family / Dependent Booking (Zocdoc parity)
-- A guardian manages dependents (children, elderly parents, spouse)
-- who may not have their own accounts, and books appointments for them.
-- Appointments keep patient_id = guardian account (ownership/billing)
-- and gain dependent_id + a name snapshot for the actual attendee.
-- Date: 2026-10-20

CREATE TABLE IF NOT EXISTS public.patient_dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  relationship TEXT NOT NULL DEFAULT 'child'
    CHECK (relationship IN ('child', 'spouse', 'parent', 'sibling', 'other')),
  national_id TEXT,
  linked_patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.patient_dependents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians manage own dependents"
  ON public.patient_dependents FOR ALL
  USING (guardian_id = auth.uid())
  WITH CHECK (guardian_id = auth.uid());

CREATE POLICY "Providers view dependents of their patients"
  ON public.patient_dependents FOR SELECT
  USING (
    guardian_id = auth.uid()
    OR public.has_patient_relationship(auth.uid(), guardian_id)
  );

CREATE INDEX IF NOT EXISTS idx_dependents_guardian ON public.patient_dependents(guardian_id);

-- Attendee columns on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS dependent_id UUID REFERENCES public.patient_dependents(id) ON DELETE SET NULL;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booked_for_name TEXT;
