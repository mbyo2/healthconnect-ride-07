
-- =====================================================
-- MOCDOC FEATURE PARITY: COMPREHENSIVE SCHEMA UPDATE
-- =====================================================

-- 1. Patient Allergies Table (for allergy alert system)
CREATE TABLE IF NOT EXISTS public.patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  allergen_name TEXT NOT NULL,
  allergen_type TEXT NOT NULL DEFAULT 'drug', -- drug, food, environmental
  severity TEXT NOT NULL DEFAULT 'moderate', -- mild, moderate, severe, life_threatening
  reaction TEXT,
  notes TEXT,
  reported_by UUID REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own allergies" ON public.patient_allergies
  FOR SELECT TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Providers can view patient allergies" ON public.patient_allergies
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'health_personnel') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'institution_admin') OR
    public.has_role(auth.uid(), 'institution_staff')
  );

CREATE POLICY "Users and providers can insert allergies" ON public.patient_allergies
  FOR INSERT TO authenticated WITH CHECK (
    patient_id = auth.uid() OR
    public.has_role(auth.uid(), 'health_personnel') OR
    public.has_role(auth.uid(), 'institution_staff')
  );

CREATE POLICY "Users and providers can update allergies" ON public.patient_allergies
  FOR UPDATE TO authenticated USING (
    patient_id = auth.uid() OR
    public.has_role(auth.uid(), 'health_personnel') OR
    public.has_role(auth.uid(), 'institution_staff')
  );

-- 2. Drug Interactions Reference Table
CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate', -- mild, moderate, severe, contraindicated
  interaction_type TEXT NOT NULL DEFAULT 'pharmacodynamic',
  description TEXT NOT NULL,
  clinical_effect TEXT,
  management TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(drug_a, drug_b)
);

ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drug interactions" ON public.drug_interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage drug interactions" ON public.drug_interactions
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

-- 3. Drug Risk Levels
CREATE TABLE IF NOT EXISTS public.drug_risk_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL UNIQUE,
  generic_name TEXT,
  risk_level TEXT NOT NULL DEFAULT 'normal', -- normal, high_risk, emergency_risk
  risk_category TEXT, -- LASA, NMB, Cytotoxic, Anticoagulant, etc.
  special_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.drug_risk_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drug risk levels" ON public.drug_risk_levels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage drug risk levels" ON public.drug_risk_levels
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'institution_admin')
  );

-- 4. Infection Records
CREATE TABLE IF NOT EXISTS public.infection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admission_id UUID,
  infection_type TEXT NOT NULL,
  infection_site TEXT,
  organism TEXT,
  source TEXT,
  detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  risk_factors TEXT[],
  preventive_measures TEXT[],
  prophylactic_drugs TEXT[],
  follow_up_notes TEXT,
  outcome TEXT, -- resolved, ongoing, deceased
  status TEXT DEFAULT 'active', -- active, resolved, closed
  reported_by UUID REFERENCES auth.users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.infection_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage infection records" ON public.infection_records
  FOR ALL TO authenticated USING (
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

-- 5. OT Enhanced Fields - Anaesthesia records
CREATE TABLE IF NOT EXISTS public.ot_anaesthesia_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  admission_id UUID,
  ot_booking_id TEXT,
  anaesthesia_type TEXT NOT NULL, -- General, Spinal, Epidural, Local, Regional
  anaesthetist_name TEXT,
  pre_op_assessment TEXT,
  drugs_administered JSONB DEFAULT '[]'::jsonb,
  intraop_monitoring JSONB DEFAULT '{}'::jsonb,
  recovery_vitals JSONB DEFAULT '{}'::jsonb,
  post_anaesthesia_status TEXT, -- Stable, Disoriented, Oriented, Critical
  complications TEXT,
  checkin_time TIMESTAMPTZ,
  surgery_start_time TIMESTAMPTZ,
  surgery_end_time TIMESTAMPTZ,
  checkout_time TIMESTAMPTZ,
  consent_signed BOOLEAN DEFAULT false,
  guardian_name TEXT,
  guardian_signature TEXT,
  is_minor BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ot_anaesthesia_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage OT records" ON public.ot_anaesthesia_records
  FOR ALL TO authenticated USING (
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

-- 6. IP Discharge Checklist
CREATE TABLE IF NOT EXISTS public.discharge_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  admission_id TEXT NOT NULL,
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  medical_clearance BOOLEAN DEFAULT false,
  medical_cleared_by TEXT,
  medical_cleared_at TIMESTAMPTZ,
  discharge_summary_clearance BOOLEAN DEFAULT false,
  summary_cleared_by TEXT,
  summary_cleared_at TIMESTAMPTZ,
  medication_reconciliation BOOLEAN DEFAULT false,
  medication_reconciled_by TEXT,
  medication_reconciled_at TIMESTAMPTZ,
  nursing_clearance BOOLEAN DEFAULT false,
  nursing_cleared_by TEXT,
  nursing_cleared_at TIMESTAMPTZ,
  patient_education_completed BOOLEAN DEFAULT false,
  education_completed_by TEXT,
  education_completed_at TIMESTAMPTZ,
  billing_clearance BOOLEAN DEFAULT false,
  billing_cleared_by TEXT,
  billing_cleared_at TIMESTAMPTZ,
  all_cleared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.discharge_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage discharge checklists" ON public.discharge_checklists
  FOR ALL TO authenticated USING (
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

-- 7. Patient Feedback
CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id),
  patient_id UUID REFERENCES auth.users(id) NOT NULL,
  provider_id UUID REFERENCES auth.users(id),
  department TEXT,
  visit_type TEXT, -- opd, ipd, emergency
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  staff_rating INTEGER CHECK (staff_rating >= 1 AND staff_rating <= 5),
  wait_time_rating INTEGER CHECK (wait_time_rating >= 1 AND wait_time_rating <= 5),
  comments TEXT,
  suggestions TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending', -- pending, reviewed, addressed
  response TEXT,
  responded_by UUID REFERENCES auth.users(id),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can insert feedback" ON public.patient_feedback
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can view own feedback" ON public.patient_feedback
  FOR SELECT TO authenticated USING (
    patient_id = auth.uid() OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'institution_admin') OR
    public.has_role(auth.uid(), 'institution_staff')
  );

CREATE POLICY "Admins can manage feedback" ON public.patient_feedback
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'institution_admin')
  );

-- 8. Hospital Notifications Center
CREATE TABLE IF NOT EXISTS public.hospital_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id),
  category TEXT NOT NULL, -- admission, discharge, pharmacy, lab, ot, billing, security
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info', -- info, warning, critical
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hospital_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view hospital notifications" ON public.hospital_notifications
  FOR SELECT TO authenticated USING (
    recipient_id = auth.uid() OR
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

CREATE POLICY "System can insert notifications" ON public.hospital_notifications
  FOR INSERT TO authenticated WITH CHECK (
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

CREATE POLICY "Users can update own notifications" ON public.hospital_notifications
  FOR UPDATE TO authenticated USING (
    recipient_id = auth.uid() OR
    public.is_institution_admin(hospital_id)
  );

-- 9. Failed Login Security Log
CREATE TABLE IF NOT EXISTS public.login_security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  browser TEXT,
  platform TEXT,
  event_type TEXT NOT NULL DEFAULT 'failed_login', -- failed_login, account_locked, password_expired
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.login_security_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view login security log" ON public.login_security_log
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Anyone can insert login events" ON public.login_security_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- 10. Password Policy Settings
CREATE TABLE IF NOT EXISTS public.password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  expiry_days INTEGER DEFAULT 90, -- 30, 60, 90
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_failed_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read password policies" ON public.password_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage password policies" ON public.password_policies
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'institution_admin')
  );

-- 11. Lab Reflex Tests Configuration
CREATE TABLE IF NOT EXISTS public.lab_reflex_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE NOT NULL,
  primary_test_name TEXT NOT NULL,
  trigger_condition TEXT NOT NULL, -- e.g., "value > 7.0"
  reflex_test_name TEXT NOT NULL,
  auto_add BOOLEAN DEFAULT true,
  charge_amount NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lab_reflex_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can manage reflex tests" ON public.lab_reflex_tests
  FOR ALL TO authenticated USING (
    public.is_institution_admin(hospital_id) OR
    public.is_institution_staff_member(hospital_id)
  );

-- 12. Patient Document Folders (Docket Organization)
CREATE TABLE IF NOT EXISTS public.patient_doc_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  folder_name TEXT NOT NULL,
  folder_type TEXT DEFAULT 'custom', -- lab_reports, imaging, prescriptions, referrals, custom
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patient_doc_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own folders" ON public.patient_doc_folders
  FOR ALL TO authenticated USING (
    patient_id = auth.uid() OR
    public.has_role(auth.uid(), 'health_personnel') OR
    public.has_role(auth.uid(), 'institution_staff')
  );

-- Seed some common drug interactions
INSERT INTO public.drug_interactions (drug_a, drug_b, severity, interaction_type, description, clinical_effect, management) VALUES
('Warfarin', 'Aspirin', 'severe', 'pharmacodynamic', 'Increased bleeding risk', 'Both drugs affect coagulation through different mechanisms', 'Monitor INR closely; consider alternative'),
('Metformin', 'Contrast Dye', 'severe', 'pharmacokinetic', 'Risk of lactic acidosis', 'Contrast dye may impair renal function needed to clear metformin', 'Hold metformin 48h before/after contrast'),
('ACE Inhibitors', 'Potassium', 'moderate', 'pharmacodynamic', 'Hyperkalemia risk', 'ACE inhibitors reduce potassium excretion', 'Monitor serum potassium levels'),
('SSRIs', 'MAOIs', 'contraindicated', 'pharmacodynamic', 'Serotonin syndrome risk', 'Both increase serotonin levels', 'Never combine; 14-day washout required'),
('Ciprofloxacin', 'Theophylline', 'severe', 'pharmacokinetic', 'Theophylline toxicity', 'Ciprofloxacin inhibits CYP1A2 metabolism of theophylline', 'Reduce theophylline dose by 30-50%'),
('Simvastatin', 'Erythromycin', 'severe', 'pharmacokinetic', 'Rhabdomyolysis risk', 'CYP3A4 inhibition increases statin levels', 'Use alternative statin or antibiotic'),
('Digoxin', 'Amiodarone', 'severe', 'pharmacokinetic', 'Digoxin toxicity', 'Amiodarone increases digoxin levels', 'Reduce digoxin dose by 50%'),
('Clopidogrel', 'Omeprazole', 'moderate', 'pharmacokinetic', 'Reduced antiplatelet effect', 'Omeprazole inhibits CYP2C19 activation of clopidogrel', 'Use pantoprazole instead'),
('Lithium', 'NSAIDs', 'severe', 'pharmacokinetic', 'Lithium toxicity', 'NSAIDs reduce renal clearance of lithium', 'Monitor lithium levels; use alternative analgesic'),
('Methotrexate', 'Trimethoprim', 'severe', 'pharmacodynamic', 'Pancytopenia risk', 'Both are folate antagonists', 'Avoid combination; use alternative antibiotic');

-- Seed drug risk levels
INSERT INTO public.drug_risk_levels (drug_name, generic_name, risk_level, risk_category, special_instructions) VALUES
('Heparin', 'Heparin Sodium', 'high_risk', 'Anticoagulant', 'Double-check dose. Monitor aPTT.'),
('Insulin', 'Insulin (all forms)', 'high_risk', 'Hypoglycemic', 'Verify units. Never abbreviate "U".'),
('Potassium Chloride', 'KCl', 'high_risk', 'Electrolyte', 'Never give undiluted IV push.'),
('Morphine', 'Morphine Sulfate', 'high_risk', 'Opioid', 'Check respiratory rate before admin.'),
('Methotrexate', 'Methotrexate', 'high_risk', 'Cytotoxic', 'Weekly dosing only for non-oncology. Verify frequency.'),
('Epinephrine', 'Adrenaline', 'emergency_risk', 'Vasopressor', 'Verify concentration before admin.'),
('Atropine', 'Atropine Sulfate', 'emergency_risk', 'Anticholinergic', 'Emergency use: 0.5mg IV for bradycardia'),
('Amiodarone', 'Amiodarone HCl', 'emergency_risk', 'Antiarrhythmic', 'Use only with cardiac monitoring'),
('Norepinephrine', 'Noradrenaline', 'emergency_risk', 'Vasopressor', 'Central line preferred. Monitor BP continuously.'),
('Succinylcholine', 'Suxamethonium', 'emergency_risk', 'NMB Agent', 'Verify no hyperkalemia. Have reversal agent ready.');
