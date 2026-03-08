
-- ═══════════════════════════════════════════════════════════════
-- 1. QUEUE TOKEN SYSTEM (Receptionist)
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.queue_priority AS ENUM ('emergency', 'urgent', 'normal', 'low');
CREATE TYPE public.queue_status AS ENUM ('waiting', 'serving', 'completed', 'cancelled', 'no_show');

CREATE TABLE public.queue_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id),
  token_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'General',
  priority queue_priority NOT NULL DEFAULT 'normal',
  status queue_status NOT NULL DEFAULT 'waiting',
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  serving_start_time TIMESTAMPTZ,
  completed_time TIMESTAMPTZ,
  assigned_doctor_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_queue_tokens_institution ON public.queue_tokens(institution_id, status, created_at);
CREATE INDEX idx_queue_tokens_date ON public.queue_tokens(institution_id, created_at);

ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage queue tokens"
  ON public.queue_tokens FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

-- Auto-generate token number
CREATE OR REPLACE FUNCTION public.generate_token_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.queue_tokens
  WHERE institution_id = NEW.institution_id
    AND created_at::date = CURRENT_DATE;

  v_prefix := CASE NEW.priority
    WHEN 'emergency' THEN 'E'
    WHEN 'urgent' THEN 'U'
    WHEN 'normal' THEN 'T'
    WHEN 'low' THEN 'L'
  END;

  NEW.token_number := v_prefix || '-' || LPAD(v_count::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_token_number
  BEFORE INSERT ON public.queue_tokens
  FOR EACH ROW EXECUTE FUNCTION public.generate_token_number();

-- ═══════════════════════════════════════════════════════════════
-- 2. TRIAGE ASSESSMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.triage_level AS ENUM ('critical', 'urgent', 'standard', 'non_urgent');

CREATE TABLE public.triage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id),
  queue_token_id UUID REFERENCES public.queue_tokens(id),
  patient_name TEXT NOT NULL,
  triage_level triage_level NOT NULL DEFAULT 'standard',
  chief_complaint TEXT NOT NULL,
  vital_signs JSONB DEFAULT '{}',
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  consciousness_level TEXT DEFAULT 'alert',
  mobility TEXT DEFAULT 'ambulatory',
  bleeding BOOLEAN DEFAULT false,
  allergies TEXT,
  current_medications TEXT,
  assessment_notes TEXT,
  disposition TEXT,
  assessed_by UUID NOT NULL REFERENCES auth.users(id),
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_triage_institution ON public.triage_assessments(institution_id, triage_level, assessed_at);

ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage triage"
  ON public.triage_assessments FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

-- ═══════════════════════════════════════════════════════════════
-- 3. HR / PAYROLL MODULE
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');

CREATE TABLE public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'present',
  hours_worked NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, staff_id, date)
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view own attendance"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "HR can manage attendance"
  ON public.staff_attendance FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own leave requests"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "Staff can create leave requests"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "HR can manage leave requests"
  ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE TABLE public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  allowances NUMERIC(12,2) DEFAULT 0,
  deductions NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'ZMW',
  status TEXT NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own payroll"
  ON public.payroll_records FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "HR can manage payroll"
  ON public.payroll_records FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

-- ═══════════════════════════════════════════════════════════════
-- 4. BILLING CLERK MODULE (dedicated tables)
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded');
CREATE TYPE public.payment_mode AS ENUM ('cash', 'card', 'mobile_money', 'insurance', 'bank_transfer', 'cheque');

CREATE TABLE public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id),
  invoice_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  admission_id UUID REFERENCES public.hospital_admissions(id),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  notes TEXT,
  insurance_provider TEXT,
  insurance_claim_number TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_invoices_institution ON public.billing_invoices(institution_id, status, created_at);

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing staff can manage invoices"
  ON public.billing_invoices FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

CREATE POLICY "Patients can view own invoices"
  ON public.billing_invoices FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE TABLE public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.billing_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_mode payment_mode NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing staff can manage payments"
  ON public.billing_payments FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.billing_invoices
  WHERE institution_id = NEW.institution_id
    AND created_at::date = CURRENT_DATE;

  NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();

-- Update invoice balance on payment
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_total NUMERIC(12,2);
  v_paid NUMERIC(12,2);
BEGIN
  SELECT total_amount INTO v_total FROM public.billing_invoices WHERE id = NEW.invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.billing_payments WHERE invoice_id = NEW.invoice_id;

  UPDATE public.billing_invoices
  SET paid_amount = v_paid,
      balance = v_total - v_paid,
      status = CASE
        WHEN v_paid >= v_total THEN 'paid'::invoice_status
        WHEN v_paid > 0 THEN 'partial'::invoice_status
        ELSE status
      END,
      updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_invoice_on_payment
  AFTER INSERT ON public.billing_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_on_payment();

-- Insurance claims table
CREATE TABLE public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.billing_invoices(id),
  patient_id UUID REFERENCES public.profiles(id),
  patient_name TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  claim_amount NUMERIC(12,2) NOT NULL,
  approved_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  documents JSONB DEFAULT '[]',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing staff can manage claims"
  ON public.insurance_claims FOR ALL TO authenticated
  USING (public.is_institution_staff(institution_id, auth.uid()) OR public.is_institution_admin(institution_id));
