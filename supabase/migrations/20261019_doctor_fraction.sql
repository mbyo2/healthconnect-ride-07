-- Dr. Fraction Management System (Danphe-style)
-- Dynamic doctor revenue fraction rules: percentage splits per procedure/doctor
-- Date: 2026-10-19

-- Fraction rules: what % each doctor gets for each procedure type
CREATE TABLE IF NOT EXISTS public.doctor_fraction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- What this rule applies to (null = applies to all)
  procedure_category TEXT, -- e.g., 'consultation', 'surgery', 'procedure', 'lab', 'imaging'
  procedure_code TEXT, -- specific procedure code, null = all in category
  -- The fraction
  doctor_percentage DECIMAL(5,2) NOT NULL CHECK (doctor_percentage >= 0 AND doctor_percentage <= 100),
  institution_percentage DECIMAL(5,2) GENERATED ALWAYS AS (100 - doctor_percentage) STORED,
  -- Validity
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent overlapping rules
  UNIQUE(institution_id, doctor_id, procedure_category, procedure_code, effective_from)
);

-- Calculated fraction earnings per transaction
CREATE TABLE IF NOT EXISTS public.doctor_fraction_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.doctor_fraction_rules(id),
  -- Source transaction
  billing_id UUID, -- references hospital_billing
  appointment_id UUID, -- references appointments
  procedure_name TEXT NOT NULL,
  procedure_category TEXT,
  -- Amounts
  gross_amount DECIMAL(12,2) NOT NULL,
  doctor_percentage DECIMAL(5,2) NOT NULL,
  doctor_amount DECIMAL(12,2) GENERATED ALWAYS AS (gross_amount * doctor_percentage / 100) STORED,
  institution_amount DECIMAL(12,2) GENERATED ALWAYS AS (gross_amount * (100 - doctor_percentage) / 100) STORED,
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.doctor_fraction_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_fraction_earnings ENABLE ROW LEVEL SECURITY;

-- Institution admins and finance can manage rules
CREATE POLICY "Institution staff view fraction rules"
  ON public.doctor_fraction_rules FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Admins manage fraction rules"
  ON public.doctor_fraction_rules FOR ALL
  USING (
    public.is_institution_admin(institution_id)
  )
  WITH CHECK (
    public.is_institution_admin(institution_id)
  );

-- Doctors see own earnings, admins see all
CREATE POLICY "View fraction earnings"
  ON public.doctor_fraction_earnings FOR SELECT
  USING (
    doctor_id = auth.uid()
    OR institution_id IN (
      SELECT institution_id FROM public.institution_staff
      WHERE provider_id = auth.uid() AND is_active = TRUE
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fraction_rules_institution ON public.doctor_fraction_rules(institution_id);
CREATE INDEX IF NOT EXISTS idx_fraction_rules_doctor ON public.doctor_fraction_rules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_fraction_earnings_doctor ON public.doctor_fraction_earnings(doctor_id);
CREATE INDEX IF NOT EXISTS idx_fraction_earnings_institution ON public.doctor_fraction_earnings(institution_id);
CREATE INDEX IF NOT EXISTS idx_fraction_earnings_status ON public.doctor_fraction_earnings(status);
