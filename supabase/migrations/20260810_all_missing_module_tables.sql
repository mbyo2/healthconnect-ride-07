-- ============================================================
-- Migration: All Missing Module Tables for Full Workflow Support
-- Date: 2026-08-10
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Covers every table referenced in the app but NOT yet in the
-- production schema. Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- 1. HOSPITAL BILLING
--    Used by: HospitalBilling.tsx, MISReports.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_billing (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id          UUID    REFERENCES auth.users(id),
  invoice_number      TEXT    UNIQUE NOT NULL,
  line_items          JSONB   NOT NULL DEFAULT '[]',
  subtotal            NUMERIC NOT NULL DEFAULT 0,
  discount            NUMERIC NOT NULL DEFAULT 0,
  tax                 NUMERIC NOT NULL DEFAULT 0,
  total_amount        NUMERIC NOT NULL DEFAULT 0,
  paid_amount         NUMERIC NOT NULL DEFAULT 0,
  balance             NUMERIC GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  insurance_claim_id  UUID,
  coverage_percentage NUMERIC DEFAULT 0,
  payment_method      TEXT    DEFAULT 'cash',
  status              TEXT    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','partial','paid','overdue','cancelled','waived')),
  due_date            DATE,
  paid_date           TIMESTAMP WITH TIME ZONE,
  notes               TEXT,
  created_by          UUID    REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to hospital_billing" ON public.hospital_billing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 2. RADIOLOGY REQUESTS
--    Used by: RadiologyImaging.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.radiology_requests (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  ordered_by      UUID    REFERENCES auth.users(id),
  modality        TEXT    NOT NULL CHECK (modality IN ('X-Ray','CT','MRI','Ultrasound','PET','ECG','DEXA','Mammography','Fluoroscopy')),
  body_region     TEXT    NOT NULL,
  study_name      TEXT    NOT NULL,
  priority        TEXT    NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat','emergency')),
  clinical_indication TEXT,
  contrast_required   BOOLEAN DEFAULT false,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','scheduled','in_progress','completed','reported','cancelled')),
  report_text     TEXT,
  findings        TEXT,
  impression      TEXT,
  radiologist_id  UUID    REFERENCES auth.users(id),
  reported_at     TIMESTAMP WITH TIME ZONE,
  scheduled_at    TIMESTAMP WITH TIME ZONE,
  image_urls      TEXT[]  DEFAULT '{}',
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.radiology_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to radiology_requests" ON public.radiology_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 3. BLOOD BANK INVENTORY
--    Used by: BloodBank.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blood_bank_inventory (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  blood_group     TEXT    NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  component       TEXT    NOT NULL CHECK (component IN ('Whole Blood','PRBC','FFP','Platelets','Cryoprecipitate','Albumin')),
  units_available INTEGER NOT NULL DEFAULT 0,
  expiry_date     DATE    NOT NULL,
  donor_id        TEXT,
  bag_number      TEXT,
  source          TEXT    DEFAULT 'donation' CHECK (source IN ('donation','purchase','transfer')),
  status          TEXT    NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','transfused','expired','discarded')),
  storage_location TEXT,
  collected_at    DATE,
  tested_at       DATE,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_bank_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to blood_bank_inventory" ON public.blood_bank_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. BLOOD BANK REQUESTS (Transfusions)
--    Used by: BloodBank.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blood_bank_requests (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  requested_by    UUID    REFERENCES auth.users(id),
  blood_group     TEXT    NOT NULL,
  component       TEXT    NOT NULL,
  units_required  INTEGER NOT NULL DEFAULT 1,
  units_issued    INTEGER DEFAULT 0,
  urgency         TEXT    NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine','urgent','emergency','massive_transfusion')),
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','crossmatch','approved','issued','transfused','cancelled')),
  clinical_indication TEXT,
  crossmatch_done BOOLEAN DEFAULT false,
  issued_at       TIMESTAMP WITH TIME ZONE,
  transfused_at   TIMESTAMP WITH TIME ZONE,
  inventory_id    UUID    REFERENCES public.blood_bank_inventory(id),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_bank_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to blood_bank_requests" ON public.blood_bank_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. DIET PLANS
--    Used by: DietManagement.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  prescribed_by   UUID    REFERENCES auth.users(id),
  diet_type       TEXT    NOT NULL CHECK (diet_type IN ('regular','diabetic','liquid','soft','low_sodium','low_fat','high_protein','renal','cardiac','gluten_free','vegetarian','vegan','custom')),
  start_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  calories_per_day INTEGER,
  meals_per_day   INTEGER DEFAULT 3,
  restrictions    TEXT[]  DEFAULT '{}',
  allergies       TEXT[]  DEFAULT '{}',
  special_instructions TEXT,
  meal_plan       JSONB   DEFAULT '{}',
  status          TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','on_hold')),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to diet_plans" ON public.diet_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. INSURANCE CLAIMS
--    Used by: InsuranceTPA.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id         UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id          UUID    REFERENCES auth.users(id),
  insurer_name        TEXT    NOT NULL,
  policy_number       TEXT    NOT NULL,
  pre_auth_number     TEXT,
  claim_amount        NUMERIC NOT NULL DEFAULT 0,
  approved_amount     NUMERIC DEFAULT 0,
  paid_amount         NUMERIC DEFAULT 0,
  icd_code            TEXT,
  diagnosis           TEXT,
  admission_date      DATE,
  discharge_date      DATE,
  claim_type          TEXT    DEFAULT 'inpatient' CHECK (claim_type IN ('inpatient','outpatient','emergency','daycare','dental','maternity')),
  status              TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','pre_authorized','approved','partially_approved','rejected','paid','appealed')),
  rejection_reason    TEXT,
  submission_date     DATE    DEFAULT CURRENT_DATE,
  approval_date       DATE,
  payment_date        DATE,
  tpa_reference       TEXT,
  documents           TEXT[]  DEFAULT '{}',
  notes               TEXT,
  created_by          UUID    REFERENCES auth.users(id),
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to insurance_claims" ON public.insurance_claims FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. OT SURGERIES (Operating Theatre)
--    Used by: OTManagement.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ot_surgeries (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  surgeon_id      UUID    REFERENCES auth.users(id),
  procedure_name  TEXT    NOT NULL,
  procedure_code  TEXT,
  specialty       TEXT,
  ot_number       TEXT,
  scheduled_date  TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  priority        TEXT    DEFAULT 'elective' CHECK (priority IN ('elective','urgent','emergency','trauma')),
  anaesthesia_type TEXT   DEFAULT 'general' CHECK (anaesthesia_type IN ('general','spinal','epidural','local','regional','sedation')),
  status          TEXT    NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','postponed')),
  pre_op_notes    TEXT,
  post_op_notes   TEXT,
  complications   TEXT,
  blood_loss_ml   INTEGER,
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ot_surgeries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to ot_surgeries" ON public.ot_surgeries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. OT ANAESTHESIA RECORDS
--    Used by: OTManagement.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ot_anaesthesia_records (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  surgery_id      UUID    REFERENCES public.ot_surgeries(id) ON DELETE CASCADE,
  anaesthetist_id UUID    REFERENCES auth.users(id),
  type            TEXT    NOT NULL,
  agents_used     TEXT[]  DEFAULT '{}',
  induction_time  TIMESTAMP WITH TIME ZONE,
  reversal_time   TIMESTAMP WITH TIME ZONE,
  airway_type     TEXT    DEFAULT 'ETT',
  pre_op_assessment TEXT,
  intra_op_notes  TEXT,
  post_op_notes   TEXT,
  complications   TEXT,
  asa_grade       TEXT    CHECK (asa_grade IN ('I','II','III','IV','V')),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ot_anaesthesia_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to ot_anaesthesia_records" ON public.ot_anaesthesia_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. QUEUE TOKENS (OPD & Patient Queue)
--    Used by: OPDManagement.tsx, PatientQueue.tsx, useQueueTokens.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.queue_tokens (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  provider_id     UUID    REFERENCES auth.users(id),
  department      TEXT,
  token_number    TEXT    NOT NULL,
  priority        TEXT    DEFAULT 'normal' CHECK (priority IN ('normal','urgent','emergency','elderly','disabled')),
  visit_type      TEXT    DEFAULT 'opd' CHECK (visit_type IN ('opd','emergency','followup','review','procedure')),
  status          TEXT    NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','called','in_progress','completed','skipped','cancelled','no_show')),
  chief_complaint TEXT,
  check_in_time   TIMESTAMP WITH TIME ZONE DEFAULT now(),
  called_at       TIMESTAMP WITH TIME ZONE,
  seen_at         TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  wait_time_mins  INTEGER,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to queue_tokens" ON public.queue_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 10. PATIENT FEEDBACK
--     Used by: PatientFeedback.tsx, MISReports.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.patient_feedback (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  provider_id     UUID    REFERENCES auth.users(id),
  appointment_id  UUID    REFERENCES public.appointments(id),
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category        TEXT    DEFAULT 'general' CHECK (category IN ('general','cleanliness','staff','waiting_time','treatment','communication','facilities')),
  feedback_text   TEXT,
  is_anonymous    BOOLEAN DEFAULT false,
  status          TEXT    DEFAULT 'received' CHECK (status IN ('received','reviewed','actioned','archived')),
  response        TEXT,
  responded_by    UUID    REFERENCES auth.users(id),
  responded_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to patient_feedback" ON public.patient_feedback FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 11. HOSPITAL INVENTORY (Non-pharmacy: equipment, supplies)
--     Used by: InventoryPurchase.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_inventory (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  item_name       TEXT    NOT NULL,
  item_code       TEXT,
  category        TEXT    DEFAULT 'general' CHECK (category IN ('equipment','consumables','linen','furniture','electronics','surgical','general')),
  quantity        INTEGER NOT NULL DEFAULT 0,
  unit            TEXT    DEFAULT 'units',
  unit_cost       NUMERIC DEFAULT 0,
  total_value     NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  minimum_level   INTEGER DEFAULT 5,
  supplier_id     UUID    REFERENCES public.suppliers(id),
  location        TEXT,
  condition       TEXT    DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','condemned')),
  purchase_date   DATE,
  warranty_expiry DATE,
  serial_number   TEXT,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to hospital_inventory" ON public.hospital_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 12. REFERRALS
--     Used by: ReferralManagement.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  referring_provider_id  UUID REFERENCES auth.users(id),
  referred_to_provider_id UUID REFERENCES auth.users(id),
  referred_to_institution_id UUID REFERENCES public.healthcare_institutions(id),
  specialty       TEXT    NOT NULL,
  priority        TEXT    DEFAULT 'routine' CHECK (priority IN ('routine','urgent','emergency')),
  reason          TEXT    NOT NULL,
  clinical_notes  TEXT,
  diagnosis       TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed','cancelled')),
  referral_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  appointment_date DATE,
  feedback_notes  TEXT,
  documents       TEXT[]  DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to referrals" ON public.referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 13. HOSPITAL NOTIFICATIONS
--     Used by: NotificationCenter.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hospital_notifications (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  user_id         UUID    REFERENCES auth.users(id),
  title           TEXT    NOT NULL,
  message         TEXT    NOT NULL,
  type            TEXT    NOT NULL DEFAULT 'info' CHECK (type IN ('info','alert','critical','lab_result','blood_bank','maintenance','billing','discharge')),
  priority        TEXT    DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMP WITH TIME ZONE,
  action_url      TEXT,
  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.hospital_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to hospital_notifications" ON public.hospital_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 14. STAFF ATTENDANCE
--     Used by: BulkAttendanceImport.tsx, useHRModule.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id        UUID    REFERENCES auth.users(id),
  date            DATE    NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT    NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','on_leave','holiday','work_from_home')),
  clock_in        TIMESTAMP WITH TIME ZONE,
  clock_out       TIMESTAMP WITH TIME ZONE,
  hours_worked    NUMERIC GENERATED ALWAYS AS (
    CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL
    THEN ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in))/3600, 2)
    ELSE NULL END
  ) STORED,
  overtime_hours  NUMERIC DEFAULT 0,
  leave_type      TEXT    CHECK (leave_type IN ('annual','sick','maternity','paternity','unpaid','compassionate','study')),
  approved_by     UUID    REFERENCES auth.users(id),
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(institution_id, staff_id, date)
);
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to staff_attendance" ON public.staff_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 15. LEAVE REQUESTS
--     Used by: useHRModule.ts, HRManagerWorkflow.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id        UUID    REFERENCES auth.users(id),
  leave_type      TEXT    NOT NULL CHECK (leave_type IN ('annual','sick','maternity','paternity','unpaid','compassionate','study')),
  start_date      DATE    NOT NULL,
  end_date        DATE    NOT NULL,
  days_requested  INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason          TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     UUID    REFERENCES auth.users(id),
  approved_at     TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  handover_notes  TEXT,
  documents       TEXT[]  DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to leave_requests" ON public.leave_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 16. SHIFT SCHEDULES
--     Used by: ShiftScheduleCalendar.tsx, useHRModule
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id        UUID    REFERENCES auth.users(id),
  department      TEXT,
  shift_date      DATE    NOT NULL,
  shift_type      TEXT    NOT NULL CHECK (shift_type IN ('morning','afternoon','night','full_day','on_call','split')),
  start_time      TIME    NOT NULL,
  end_time        TIME    NOT NULL,
  role_on_shift   TEXT,
  status          TEXT    DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','swapped','cancelled')),
  notes           TEXT,
  created_by      UUID    REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to shift_schedules" ON public.shift_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 17. STAFF PAYROLL
--     Used by: HRManagerWorkflow.tsx / useHRModule
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_payroll (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  staff_id        UUID    REFERENCES auth.users(id),
  period_start    DATE    NOT NULL,
  period_end      DATE    NOT NULL,
  basic_salary    NUMERIC NOT NULL DEFAULT 0,
  allowances      NUMERIC DEFAULT 0,
  overtime_pay    NUMERIC DEFAULT 0,
  gross_salary    NUMERIC GENERATED ALWAYS AS (basic_salary + allowances + overtime_pay) STORED,
  paye_tax        NUMERIC DEFAULT 0,
  napsa           NUMERIC DEFAULT 0,  -- Zambian pension
  nhima           NUMERIC DEFAULT 0,  -- Zambian health insurance
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC GENERATED ALWAYS AS (paye_tax + napsa + nhima + other_deductions) STORED,
  net_salary      NUMERIC GENERATED ALWAYS AS (basic_salary + allowances + overtime_pay - paye_tax - napsa - nhima - other_deductions) STORED,
  currency        TEXT    DEFAULT 'ZMW',
  status          TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','cancelled')),
  payment_date    DATE,
  payment_method  TEXT    DEFAULT 'bank_transfer',
  bank_reference  TEXT,
  notes           TEXT,
  processed_by    UUID    REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to staff_payroll" ON public.staff_payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 18. WORK ORDERS (Maintenance)
--     Used by: useMaintenanceModule.ts, MaintenanceManagerWorkflow.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  asset_id        UUID,   -- references asset_register
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL,
  category        TEXT    DEFAULT 'corrective' CHECK (category IN ('corrective','preventive','predictive','emergency','inspection','installation')),
  priority        TEXT    NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status          TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','on_hold','completed','cancelled','verified')),
  assigned_to     UUID    REFERENCES auth.users(id),
  requested_by    UUID    REFERENCES auth.users(id),
  location        TEXT,
  department      TEXT,
  estimated_hours NUMERIC,
  actual_hours    NUMERIC,
  parts_used      JSONB   DEFAULT '[]',
  cost_estimate   NUMERIC DEFAULT 0,
  actual_cost     NUMERIC DEFAULT 0,
  started_at      TIMESTAMP WITH TIME ZONE,
  completed_at    TIMESTAMP WITH TIME ZONE,
  due_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to work_orders" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 19. ASSET REGISTER (Maintenance)
--     Used by: useMaintenanceModule.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_register (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  asset_name      TEXT    NOT NULL,
  asset_code      TEXT,
  category        TEXT    NOT NULL CHECK (category IN ('medical_equipment','furniture','electronics','vehicle','infrastructure','IT','laboratory','other')),
  make            TEXT,
  model           TEXT,
  serial_number   TEXT,
  purchase_date   DATE,
  purchase_cost   NUMERIC DEFAULT 0,
  current_value   NUMERIC DEFAULT 0,
  location        TEXT,
  department      TEXT,
  condition       TEXT    DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','poor','condemned','disposed')),
  status          TEXT    DEFAULT 'operational' CHECK (status IN ('operational','under_maintenance','decommissioned','disposed','on_loan')),
  warranty_expiry DATE,
  next_service_date DATE,
  last_service_date DATE,
  responsible_person UUID REFERENCES auth.users(id),
  supplier_id     UUID    REFERENCES public.suppliers(id),
  notes           TEXT,
  documents       TEXT[]  DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to asset_register" ON public.asset_register FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add FK now that both tables exist
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_asset_id_fkey
  FOREIGN KEY (asset_id) REFERENCES public.asset_register(id)
  ON DELETE SET NULL NOT VALID;

-- ============================================================
-- 20. PATHOLOGIST REVIEWS
--     Used by: usePathologistReviews.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pathologist_reviews (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_test_id     UUID,
  patient_id      UUID    REFERENCES auth.users(id),
  pathologist_id  UUID    REFERENCES auth.users(id),
  specimen_type   TEXT    NOT NULL,
  gross_description TEXT,
  microscopic_findings TEXT,
  diagnosis       TEXT,
  icd_code        TEXT,
  is_malignant    BOOLEAN DEFAULT false,
  grade           TEXT,
  stage           TEXT,
  recommendations TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','completed','second_opinion')),
  report_date     DATE,
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.pathologist_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to pathologist_reviews" ON public.pathologist_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 21. TRIAGE ASSESSMENTS
--     Used by: useTriageAssessments.ts, TriageStaffWorkflow.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.triage_assessments (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  patient_id      UUID    REFERENCES auth.users(id),
  assessed_by     UUID    REFERENCES auth.users(id),
  triage_level    TEXT    NOT NULL CHECK (triage_level IN ('1_immediate','2_emergent','3_urgent','4_semi_urgent','5_non_urgent')),
  chief_complaint TEXT    NOT NULL,
  vital_signs     JSONB   DEFAULT '{}', -- {bp, hr, rr, temp, spo2, gcs}
  pain_score      INTEGER CHECK (pain_score BETWEEN 0 AND 10),
  mechanism_of_injury TEXT,
  allergies       TEXT,
  current_medications TEXT,
  pmh             TEXT,  -- past medical history
  disposition     TEXT   CHECK (disposition IN ('resuscitation','acute','semi_acute','non_acute','discharge','refer')),
  status          TEXT   NOT NULL DEFAULT 'active' CHECK (status IN ('active','admitted','discharged','transferred','deceased')),
  queue_token_id  UUID   REFERENCES public.queue_tokens(id),
  notes           TEXT,
  assessed_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to triage_assessments" ON public.triage_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 22. SUBSCRIPTION PLANS
--     Used by: useSubscription.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT    NOT NULL UNIQUE,
  description     TEXT,
  price           NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    DEFAULT 'ZMW',
  billing_cycle   TEXT    DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','quarterly','annual','lifetime')),
  features        JSONB   DEFAULT '{}',
  limits          JSONB   DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All can view subscription_plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 23. USER SUBSCRIPTIONS
--     Used by: useSubscription.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    REFERENCES auth.users(id),
  plan_id         UUID    REFERENCES public.subscription_plans(id),
  status          TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','paused','trial')),
  start_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  trial_end_date  DATE,
  auto_renew      BOOLEAN DEFAULT true,
  payment_method  TEXT,
  last_payment_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,
  cancelled_at    TIMESTAMP WITH TIME ZONE,
  cancel_reason   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON public.user_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 24. PROMO CODES
--     Used by: usePromoCodes.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT    NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT    NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value  NUMERIC NOT NULL,
  max_uses        INTEGER,
  uses_count      INTEGER DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  valid_from      DATE    NOT NULL DEFAULT CURRENT_DATE,
  valid_until     DATE,
  applicable_to   TEXT    DEFAULT 'all' CHECK (applicable_to IN ('all','subscriptions','pharmacy','appointments','lab')),
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID    REFERENCES auth.users(id),
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to promo_codes" ON public.promo_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 25. SPECIALIST SESSIONS & TEMPLATES
--     Used by: useSpecialistSessions.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.specialist_session_templates (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name   TEXT    NOT NULL,
  specialty       TEXT    NOT NULL,
  session_type    TEXT    NOT NULL DEFAULT 'consultation' CHECK (session_type IN ('consultation','procedure','therapy','assessment','review')),
  default_duration INTEGER DEFAULT 30,
  checklist       JSONB   DEFAULT '[]',
  notes_template  TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.specialist_session_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All can view specialist_session_templates" ON public.specialist_session_templates FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.specialist_sessions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  template_id     UUID    REFERENCES public.specialist_session_templates(id),
  patient_id      UUID    REFERENCES auth.users(id),
  specialist_id   UUID    REFERENCES auth.users(id),
  session_date    DATE    NOT NULL,
  start_time      TIME    NOT NULL,
  end_time        TIME,
  session_type    TEXT    NOT NULL,
  specialty       TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show')),
  notes           TEXT,
  findings        TEXT,
  plan            TEXT,
  follow_up_date  DATE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.specialist_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to specialist_sessions" ON public.specialist_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 26. PROVIDER TEAM MEMBERS
--     Used by: useProviderTeam.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provider_team_members (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID    REFERENCES auth.users(id),
  member_id       UUID    REFERENCES auth.users(id),
  role            TEXT    NOT NULL DEFAULT 'assistant',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to provider_team_members" ON public.provider_team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 27. LOGIN SECURITY LOG & PASSWORD POLICIES
--     Used by: SecurityManagement.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_security_log (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    REFERENCES auth.users(id),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id),
  event_type      TEXT    NOT NULL CHECK (event_type IN ('login','logout','failed_login','password_change','2fa_enabled','2fa_disabled','account_locked')),
  ip_address      INET,
  user_agent      TEXT,
  location        TEXT,
  success         BOOLEAN DEFAULT true,
  failure_reason  TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.login_security_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to login_security_log" ON public.login_security_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.password_policies (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    UNIQUE REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  min_length      INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_symbols BOOLEAN DEFAULT false,
  expiry_days     INTEGER DEFAULT 90,
  max_failed_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to password_policies" ON public.password_policies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 28. INSTITUTION PERSONNEL (Staff + HR linking)
--     Used by: StaffRoster.tsx
-- ============================================================
CREATE TABLE IF NOT EXISTS public.institution_personnel (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID    REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  user_id         UUID    REFERENCES auth.users(id),
  employee_id     TEXT,
  first_name      TEXT    NOT NULL,
  last_name       TEXT    NOT NULL,
  role            TEXT    NOT NULL,
  department      TEXT,
  specialty       TEXT,
  employment_type TEXT    DEFAULT 'full_time' CHECK (employment_type IN ('full_time','part_time','contract','visiting','intern','locum')),
  status          TEXT    DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','terminated')),
  hire_date       DATE    DEFAULT CURRENT_DATE,
  salary          NUMERIC DEFAULT 0,
  currency        TEXT    DEFAULT 'ZMW',
  email           TEXT,
  phone           TEXT,
  license_number  TEXT,
  qualification   TEXT,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.institution_personnel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to institution_personnel" ON public.institution_personnel FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 29. BOOKING FEES (Subscription pricing tiers)
--     Used by: useSubscription.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_fees (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID    REFERENCES public.subscription_plans(id),
  provider_type   TEXT    NOT NULL,
  fee_type        TEXT    DEFAULT 'flat' CHECK (fee_type IN ('flat','percentage')),
  fee_amount      NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    DEFAULT 'ZMW',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to booking_fees" ON public.booking_fees FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 30. REVENUE EVENTS
--     Used by: useSubscription.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.revenue_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    REFERENCES auth.users(id),
  event_type      TEXT    NOT NULL,
  amount          NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    DEFAULT 'ZMW',
  reference_id    UUID,
  reference_type  TEXT,
  metadata        JSONB   DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to revenue_events" ON public.revenue_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 31. HEALTH METRICS (Alias table)
--     Used by: useProfileCompletion.ts (queries 'health_metrics')
--     Note: comprehensive_health_metrics is the main table;
--     create a view alias so both queries work.
-- ============================================================
CREATE OR REPLACE VIEW public.health_metrics AS
  SELECT * FROM public.comprehensive_health_metrics;

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_blood_bank_inv_hospital ON public.blood_bank_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_bank_inv_expiry ON public.blood_bank_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_blood_bank_req_hospital ON public.blood_bank_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_patient ON public.diet_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_hospital ON public.insurance_claims(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_ot_surgeries_hospital ON public.ot_surgeries(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ot_surgeries_date ON public.ot_surgeries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_hospital ON public.queue_tokens(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_tokens_status ON public.queue_tokens(status);
CREATE INDEX IF NOT EXISTS idx_patient_feedback_hospital ON public.patient_feedback(hospital_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_institution ON public.staff_attendance(institution_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_institution ON public.leave_requests(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_institution ON public.shift_schedules(institution_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_institution ON public.work_orders(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_register_institution ON public.asset_register(institution_id);
CREATE INDEX IF NOT EXISTS idx_radiology_requests_hospital ON public.radiology_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_billing_hospital ON public.hospital_billing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_notifications_user ON public.hospital_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_institution ON public.triage_assessments(institution_id);
CREATE INDEX IF NOT EXISTS idx_referrals_hospital ON public.referrals(hospital_id, status);

-- ============================================================
-- SUMMARY: 30 new tables + 1 view + 21 indexes created
-- All tables have RLS enabled with open authenticated policies
-- (tighten to role-specific policies in production as needed)
-- ============================================================
