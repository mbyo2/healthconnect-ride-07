-- Prescription refill requests: patients request, providers approve/deny
CREATE TABLE IF NOT EXISTS public.prescription_refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES public.comprehensive_prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
  patient_note TEXT,
  provider_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_refill_requests_patient ON public.prescription_refill_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_provider ON public.prescription_refill_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON public.prescription_refill_requests(status);
CREATE INDEX IF NOT EXISTS idx_refill_requests_prescription ON public.prescription_refill_requests(prescription_id);

-- RLS: patients see/insert their own; providers see/decide their patients'
ALTER TABLE public.prescription_refill_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own refill requests"
  ON public.prescription_refill_requests FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients create refill requests"
  ON public.prescription_refill_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients cancel own pending requests"
  ON public.prescription_refill_requests FOR UPDATE
  USING (auth.uid() = patient_id AND status = 'pending')
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Providers view refill requests for their prescriptions"
  ON public.prescription_refill_requests FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "Providers decide refill requests"
  ON public.prescription_refill_requests FOR UPDATE
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);
