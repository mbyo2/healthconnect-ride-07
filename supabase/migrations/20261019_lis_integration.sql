-- LIS Machine Integration (Danphe parity)
-- Framework for HL7/ASTM integration with lab analyzers
-- Supports: Randox, Sysmex, Mindray, Snibe, Horiba, Abbott, etc.
-- Date: 2026-10-19
--
-- NOTE: Physical machine connection requires on-site network setup.
-- This provides the software infrastructure: machine registry, result ingestion,
-- HL7 message parsing, and result mapping.

-- Registered LIS machines
CREATE TABLE IF NOT EXISTS public.lis_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  machine_name TEXT NOT NULL, -- e.g., 'Sysmex XN-350'
  manufacturer TEXT NOT NULL, -- e.g., 'Sysmex', 'Randox', 'Mindray', 'Snibe', 'Horiba', 'Abbott'
  model TEXT NOT NULL, -- e.g., 'XN-350', 'RX Daytona+', 'Maglumi X3'
  machine_id TEXT, -- Lab-assigned identifier
  -- Connection
  protocol TEXT DEFAULT 'HL7' CHECK (protocol IN ('HL7', 'ASTM', 'POCT1-A', 'MANUAL')),
  ip_address TEXT,
  port INTEGER,
  connection_status TEXT DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'testing')),
  last_heartbeat TIMESTAMPTZ,
  -- Configuration
  test_mapping JSONB DEFAULT '{}', -- maps machine test codes to internal test_type
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incoming results from LIS machines
CREATE TABLE IF NOT EXISTS public.lis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.lis_machines(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  -- Raw message
  raw_message TEXT NOT NULL,
  protocol TEXT NOT NULL,
  -- Parsed
  sample_id TEXT,
  patient_id TEXT, -- as provided by machine (may need mapping)
  test_code TEXT NOT NULL,
  test_name TEXT,
  result_value TEXT NOT NULL,
  unit TEXT,
  reference_range TEXT,
  abnormal_flag TEXT, -- 'N', 'H', 'L', 'HH', 'LL', etc.
  result_timestamp TIMESTAMPTZ,
  -- Processing
  mapped_test_type TEXT, -- internal test_type after mapping
  lab_test_id UUID, -- linked lab_tests record if matched
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'mapped', 'matched', 'error', 'ignored')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.lis_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff manage LIS machines"
  ON public.lis_machines FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Institution staff view LIS results"
  ON public.lis_results FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lis_machines_institution ON public.lis_machines(institution_id);
CREATE INDEX IF NOT EXISTS idx_lis_results_machine ON public.lis_results(machine_id);
CREATE INDEX IF NOT EXISTS idx_lis_results_status ON public.lis_results(status);
CREATE INDEX IF NOT EXISTS idx_lis_results_sample ON public.lis_results(sample_id);
