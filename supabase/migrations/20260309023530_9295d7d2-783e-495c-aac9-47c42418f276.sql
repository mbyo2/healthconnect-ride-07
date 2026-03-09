-- Create medication_administration_records table
CREATE TABLE IF NOT EXISTS public.medication_administration_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES public.hospital_admissions(id) ON DELETE SET NULL,
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.comprehensive_prescriptions(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  route TEXT NOT NULL DEFAULT 'oral',
  frequency TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  administered_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'administered', 'missed', 'held', 'refused', 'not_given')),
  hold_reason TEXT,
  refusal_reason TEXT,
  not_given_reason TEXT,
  administered_by UUID REFERENCES public.profiles(id),
  verified_by UUID REFERENCES public.profiles(id),
  vital_signs_before JSONB,
  vital_signs_after JSONB,
  patient_response TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_administration_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view MARs" ON public.medication_administration_records
  FOR SELECT USING (
    public.is_institution_staff_member(institution_id) OR
    public.is_institution_admin(institution_id) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Staff can insert MARs" ON public.medication_administration_records
  FOR INSERT WITH CHECK (
    public.is_institution_staff_member(institution_id) OR
    public.is_institution_admin(institution_id)
  );

CREATE POLICY "Staff can update MARs" ON public.medication_administration_records
  FOR UPDATE USING (
    public.is_institution_staff_member(institution_id) OR
    public.is_institution_admin(institution_id)
  );

CREATE INDEX IF NOT EXISTS idx_mar_patient ON public.medication_administration_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_mar_institution ON public.medication_administration_records(institution_id);
CREATE INDEX IF NOT EXISTS idx_mar_scheduled ON public.medication_administration_records(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_mar_status ON public.medication_administration_records(status);

-- Create cxo_dashboard_metrics table
CREATE TABLE IF NOT EXISTS public.cxo_dashboard_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  metric_period TEXT NOT NULL DEFAULT 'daily' CHECK (metric_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,
  net_income NUMERIC(12,2) DEFAULT 0,
  accounts_receivable NUMERIC(12,2) DEFAULT 0,
  collection_rate NUMERIC(5,2) DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  new_patients INTEGER DEFAULT 0,
  returning_patients INTEGER DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_rate NUMERIC(5,2) DEFAULT 0,
  total_admissions INTEGER DEFAULT 0,
  total_discharges INTEGER DEFAULT 0,
  average_length_of_stay NUMERIC(5,2) DEFAULT 0,
  bed_occupancy_rate NUMERIC(5,2) DEFAULT 0,
  icu_occupancy_rate NUMERIC(5,2) DEFAULT 0,
  er_visits INTEGER DEFAULT 0,
  average_er_wait_time INTEGER DEFAULT 0,
  er_to_admission_rate NUMERIC(5,2) DEFAULT 0,
  lab_tests_ordered INTEGER DEFAULT 0,
  lab_tests_completed INTEGER DEFAULT 0,
  average_lab_tat INTEGER DEFAULT 0,
  radiology_exams INTEGER DEFAULT 0,
  prescriptions_filled INTEGER DEFAULT 0,
  medication_errors INTEGER DEFAULT 0,
  total_staff INTEGER DEFAULT 0,
  staff_present INTEGER DEFAULT 0,
  staff_on_leave INTEGER DEFAULT 0,
  overtime_hours NUMERIC(8,2) DEFAULT 0,
  patient_satisfaction_score NUMERIC(3,2) DEFAULT 0,
  readmission_rate NUMERIC(5,2) DEFAULT 0,
  infection_rate NUMERIC(5,2) DEFAULT 0,
  mortality_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, metric_date, metric_period)
);

ALTER TABLE public.cxo_dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CXO can view metrics" ON public.cxo_dashboard_metrics
  FOR SELECT USING (
    public.is_institution_admin(institution_id) OR
    public.has_role(auth.uid(), 'cxo'::app_role) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "System can insert metrics" ON public.cxo_dashboard_metrics
  FOR INSERT WITH CHECK (
    public.is_institution_admin(institution_id) OR
    public.is_service_role()
  );

CREATE INDEX IF NOT EXISTS idx_cxo_metrics_institution ON public.cxo_dashboard_metrics(institution_id);
CREATE INDEX IF NOT EXISTS idx_cxo_metrics_date ON public.cxo_dashboard_metrics(metric_date DESC);

-- Triggers for updated_at
CREATE TRIGGER update_mar_updated_at
  BEFORE UPDATE ON public.medication_administration_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cxo_metrics_updated_at
  BEFORE UPDATE ON public.cxo_dashboard_metrics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();