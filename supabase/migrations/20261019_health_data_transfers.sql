-- Health Data Transfers: audit trail for patient data portability between institutions

CREATE TABLE IF NOT EXISTS public.health_data_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE SET NULL,
  to_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  transferred_by UUID NOT NULL REFERENCES auth.users(id),
  transfer_type TEXT NOT NULL DEFAULT 'export' CHECK (transfer_type IN ('export', 'import')),
  resource_count INTEGER NOT NULL DEFAULT 0,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_recorded_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_data_transfers_patient 
  ON public.health_data_transfers(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_data_transfers_to_institution 
  ON public.health_data_transfers(to_institution_id);

ALTER TABLE public.health_data_transfers ENABLE ROW LEVEL SECURITY;

-- Patients can see their own transfers
CREATE POLICY "Patients view own transfers"
  ON public.health_data_transfers FOR SELECT
  USING (auth.uid() = patient_id);

-- Staff can see transfers involving their institutions
CREATE POLICY "Staff view institution transfers"
  ON public.health_data_transfers FOR SELECT
  USING (
    to_institution_id = ANY(public.user_institution_ids())
    OR from_institution_id = ANY(public.user_institution_ids())
    OR public.is_institution_admin(to_institution_id)
    OR public.is_institution_admin(from_institution_id)
  );

-- Authenticated users can create transfer records (with consent)
CREATE POLICY "Users create transfer records"
  ON public.health_data_transfers FOR INSERT
  WITH CHECK (auth.uid() = transferred_by AND consent_given = true);
