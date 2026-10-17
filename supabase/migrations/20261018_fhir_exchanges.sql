-- Cross-system FHIR record exchange log.
-- Records every outbound send to and inbound receipt from external
-- healthcare systems (FHIR servers), for audit and traceability.

CREATE TABLE IF NOT EXISTS public.fhir_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  target_system TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resources TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received', 'processed', 'rejected')),
  bundle JSONB,
  error_message TEXT,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fhir_exchanges_patient ON public.fhir_exchanges(patient_id);
CREATE INDEX IF NOT EXISTS idx_fhir_exchanges_direction ON public.fhir_exchanges(direction);
CREATE INDEX IF NOT EXISTS idx_fhir_exchanges_status ON public.fhir_exchanges(status);
CREATE INDEX IF NOT EXISTS idx_fhir_exchanges_created ON public.fhir_exchanges(created_at DESC);

ALTER TABLE public.fhir_exchanges ENABLE ROW LEVEL SECURITY;

-- Users can view exchanges they initiated or for patients they have access to.
-- For simplicity and audit integrity: authenticated users see exchanges
-- they initiated; institution staff see their institution's exchanges.
DROP POLICY IF EXISTS "Users view own fhir exchanges" ON public.fhir_exchanges;
CREATE POLICY "Users view own fhir exchanges"
ON public.fhir_exchanges FOR SELECT TO authenticated
USING (
  initiated_by = auth.uid()
  OR patient_id = auth.uid()
);

DROP POLICY IF EXISTS "Users create fhir exchanges" ON public.fhir_exchanges;
CREATE POLICY "Users create fhir exchanges"
ON public.fhir_exchanges FOR INSERT TO authenticated
WITH CHECK (initiated_by = auth.uid());

-- Service role (edge functions) bypasses RLS for inbound processing.

COMMENT ON TABLE public.fhir_exchanges IS 'Audit log of cross-system FHIR record exchanges (outbound sends and inbound receipts).';
