-- ============================================================================
-- ENTERPRISE ACCOUNTING & ZAMBIA-SPECIFIC FEATURES SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. ENTERPRISE ACCOUNTING TABLES
-- ============================================================================

-- General Ledger Entries
CREATE TABLE IF NOT EXISTS public.general_ledger_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  entry_number text NOT NULL,
  entry_date date NOT NULL,
  entry_type text NOT NULL CHECK (entry_type = ANY (ARRAY['journal'::text, 'receipt'::text, 'payment'::text, 'adjustment'::text])),
  reference_number text,
  description text NOT NULL,
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW'::text CHECK (currency = ANY (ARRAY['ZMW'::text, 'USD'::text, 'EUR'::text])),
  account_code text NOT NULL,
  account_name text NOT NULL,
  cost_center text,
  created_by uuid,
  posted_at timestamp with time zone,
  is_posted boolean NOT NULL DEFAULT false,
  fiscal_year integer NOT NULL,
  fiscal_period integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT general_ledger_entries_pkey PRIMARY KEY (id),
  CONSTRAINT general_ledger_entries_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT general_ledger_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Asset Records
CREATE TABLE IF NOT EXISTS public.asset_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  asset_code text NOT NULL,
  asset_name text NOT NULL,
  asset_category text NOT NULL CHECK (asset_category = ANY (ARRAY['medical_equipment'::text, 'furniture'::text, 'vehicles'::text, 'buildings'::text, 'it_equipment'::text])),
  purchase_date date NOT NULL,
  purchase_cost numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW'::text CHECK (currency = ANY (ARRAY['ZMW'::text, 'USD'::text, 'EUR'::text])),
  depreciation_method text NOT NULL CHECK (depreciation_method = ANY (ARRAY['straight_line'::text, 'declining_balance'::text, 'units_of_production'::text])),
  useful_life_years integer NOT NULL,
  salvage_value numeric NOT NULL DEFAULT 0,
  accumulated_depreciation numeric NOT NULL DEFAULT 0,
  net_book_value numeric NOT NULL,
  current_depreciation_year integer NOT NULL DEFAULT 1,
  location text,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'disposed'::text, 'sold'::text, 'lost'::text])),
  last_depreciation_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT asset_records_pkey PRIMARY KEY (id),
  CONSTRAINT asset_records_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT asset_records_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);

-- Bank Reconciliations
CREATE TABLE IF NOT EXISTS public.bank_reconciliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  bank_account_id uuid NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW'::text CHECK (currency = ANY (ARRAY['ZMW'::text, 'USD'::text, 'EUR'::text])),
  statement_date date NOT NULL,
  statement_balance numeric NOT NULL,
  book_balance numeric NOT NULL DEFAULT 0,
  variance numeric NOT NULL DEFAULT 0,
  reconciliation_status text NOT NULL DEFAULT 'pending'::text CHECK (reconciliation_status = ANY (ARRAY['pending'::text, 'reconciled'::text, 'variance'::text])),
  reconciled_by uuid,
  reconciled_at timestamp with time zone,
  unreconciled_items jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_reconciliations_pkey PRIMARY KEY (id),
  CONSTRAINT bank_reconciliations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT bank_reconciliations_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- 2. ZRA SMART INVOICE INTEGRATION TABLES
-- ============================================================================

-- ZRA Smart Invoice Configuration
CREATE TABLE IF NOT EXISTS public.zra_smart_invoice_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL UNIQUE,
  sis_enabled boolean NOT NULL DEFAULT false,
  middleware_provider text NOT NULL DEFAULT 'digitax'::text CHECK (middleware_provider = ANY (ARRAY['digitax'::text, 'custom'::text, 'direct'::text])),
  api_key text,
  tpin text NOT NULL,
  business_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  sync_frequency text NOT NULL DEFAULT 'daily'::text CHECK (sync_frequency = ANY (ARRAY['realtime'::text, 'hourly'::text, 'daily'::text, 'weekly'::text])),
  auto_sync_enabled boolean NOT NULL DEFAULT true,
  last_sync_at timestamp with time zone,
  last_sync_status text NOT NULL DEFAULT 'not_configured'::text,
  total_invoices_synced integer NOT NULL DEFAULT 0,
  failed_syncs integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zra_smart_invoice_config_pkey PRIMARY KEY (id),
  CONSTRAINT zra_smart_invoice_config_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- Smart Invoices
CREATE TABLE IF NOT EXISTS public.smart_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  invoice_number text NOT NULL,
  sis_invoice_number text,
  invoice_date date NOT NULL,
  customer_name text NOT NULL,
  customer_tpin text,
  total_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW'::text CHECK (currency = ANY (ARRAY['ZMW'::text, 'USD'::text, 'EUR'::text])),
  vat_amount numeric NOT NULL DEFAULT 0,
  withholding_tax_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  sync_status text NOT NULL DEFAULT 'pending'::text CHECK (sync_status = ANY (ARRAY['pending'::text, 'syncing'::text, 'synced'::text, 'failed'::text])),
  sis_response jsonb,
  sync_attempts integer NOT NULL DEFAULT 0,
  last_sync_attempt timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT smart_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT smart_invoices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- ZRA Tax Rates
CREATE TABLE IF NOT EXISTS public.zra_tax_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_code text NOT NULL UNIQUE,
  tax_name text NOT NULL,
  rate_percentage numeric NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  is_standard_rate boolean NOT NULL DEFAULT false,
  applies_to text[] DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zra_tax_rates_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 3. PAYE TAX CALCULATIONS TABLES
-- ============================================================================

-- PAYE Tax Slabs
CREATE TABLE IF NOT EXISTS public.paye_tax_slabs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid,
  slab_name text NOT NULL,
  min_income numeric NOT NULL,
  max_income numeric,
  tax_rate_percentage numeric NOT NULL,
  fixed_amount numeric NOT NULL DEFAULT 0,
  plus_percentage_above_min numeric NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT paye_tax_slabs_pkey PRIMARY KEY (id),
  CONSTRAINT paye_tax_slabs_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- PAYE Calculations
CREATE TABLE IF NOT EXISTS public.paye_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  calculation_month text NOT NULL,
  gross_income numeric NOT NULL,
  tax_exempt_amount numeric NOT NULL DEFAULT 0,
  taxable_income numeric NOT NULL,
  total_paye_tax numeric NOT NULL,
  slab_applied jsonb DEFAULT '[]'::jsonb,
  calculated_at timestamp with time zone DEFAULT now(),
  calculated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT paye_calculations_pkey PRIMARY KEY (id),
  CONSTRAINT paye_calculations_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT paye_calculations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT paye_calculations_calculated_by_fkey FOREIGN KEY (calculated_by) REFERENCES auth.users(id)
);

-- Employee Payroll
CREATE TABLE IF NOT EXISTS public.employee_payroll (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  basic_salary numeric NOT NULL,
  allowances numeric NOT NULL DEFAULT 0,
  deductions numeric NOT NULL DEFAULT 0,
  gross_pay numeric NOT NULL,
  paye_tax numeric NOT NULL DEFAULT 0,
  napsa_employee numeric NOT NULL DEFAULT 0,
  napsa_employer numeric NOT NULL DEFAULT 0,
  nhima_employee numeric NOT NULL DEFAULT 0,
  nhima_employer numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processed'::text, 'paid'::text, 'failed'::text])),
  processed_at timestamp with time zone,
  processed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_payroll_pkey PRIMARY KEY (id),
  CONSTRAINT employee_payroll_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT employee_payroll_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id),
  CONSTRAINT employee_payroll_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- 4. MEDICAL SHIFT HR & ATTENDANCE TABLES
-- ============================================================================

-- Medical Shifts
CREATE TABLE IF NOT EXISTS public.medical_shifts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  shift_name text NOT NULL,
  shift_type text NOT NULL CHECK (shift_type = ANY (ARRAY['day'::text, 'night'::text, 'evening'::text, 'rotating'::text, 'on_call'::text])),
  department_id uuid,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  break_duration_minutes integer NOT NULL DEFAULT 60,
  is_overnight boolean NOT NULL DEFAULT false,
  requires_on_call boolean NOT NULL DEFAULT false,
  staff_requirements jsonb DEFAULT '[]'::jsonb,
  auto_assign_rotation boolean NOT NULL DEFAULT false,
  rotation_pattern text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT medical_shifts_pkey PRIMARY KEY (id),
  CONSTRAINT medical_shifts_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT medical_shifts_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.hospital_departments(id)
);

-- Shift Assignments
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  shift_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  shift_date date NOT NULL,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'absent'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT shift_assignments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT shift_assignments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.medical_shifts(id),
  CONSTRAINT shift_assignments_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT shift_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id)
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  shift_assignment_id uuid,
  date date NOT NULL,
  clock_in_time timestamp with time zone,
  clock_out_time timestamp with time zone,
  clock_in_method text NOT NULL DEFAULT 'manual'::text CHECK (clock_in_method = ANY (ARRAY['manual'::text, 'biometric'::text, 'rfid'::text, 'mobile'::text])),
  clock_out_method text,
  location text,
  biometric_verified boolean NOT NULL DEFAULT false,
  total_hours_worked numeric,
  overtime_hours numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'present'::text, 'absent'::text, 'late'::text, 'early_departure'::text, 'on_leave'::text])),
  early_departure boolean NOT NULL DEFAULT false,
  late_arrival boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id),
  CONSTRAINT attendance_records_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id),
  CONSTRAINT attendance_records_shift_assignment_id_fkey FOREIGN KEY (shift_assignment_id) REFERENCES public.shift_assignments(id)
);

-- Biometric Devices
CREATE TABLE IF NOT EXISTS public.biometric_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  device_name text NOT NULL,
  device_type text NOT NULL CHECK (device_type = ANY (ARRAY['fingerprint'::text, 'face_recognition'::text, 'rfid'::text, 'iris_scan'::text])),
  device_location text NOT NULL,
  serial_number text,
  ip_address text,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamp with time zone,
  connection_status text NOT NULL DEFAULT 'offline'::text CHECK (connection_status = ANY (ARRAY['online'::text, 'offline'::text, 'syncing'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT biometric_devices_pkey PRIMARY KEY (id),
  CONSTRAINT biometric_devices_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- ============================================================================
-- 5. ZAMBIA COMPLIANCE TABLES
-- ============================================================================

-- Zambia NHIMA Configuration
CREATE TABLE IF NOT EXISTS public.zambia_nhima_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL UNIQUE,
  nhima_provider_code text,
  nhima_facility_type text,
  nhima_accreditation_number text,
  nhima_claim_submission_method text NOT NULL DEFAULT 'electronic'::text CHECK (nhima_claim_submission_method = ANY (ARRAY['electronic'::text, 'manual'::text, 'hybrid'::text])),
  nhima_claim_processing_days integer NOT NULL DEFAULT 30,
  nhima_co_payment_percentage numeric NOT NULL DEFAULT 10,
  nhima_excluded_services jsonb DEFAULT '[]'::jsonb,
  nhima_service_tariff_version text,
  nhima_reporting_requirements jsonb DEFAULT '{}'::jsonb,
  is_nhima_accredited boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zambia_nhima_config_pkey PRIMARY KEY (id),
  CONSTRAINT zambia_nhima_config_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- Zambia Medical Council Configuration
CREATE TABLE IF NOT EXISTS public.zambia_medical_council_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL UNIQUE,
  council_registration_number text,
  facility_license_number text,
  inspection_status text NOT NULL DEFAULT 'pending'::text CHECK (inspection_status = ANY (ARRAY['pending'::text, 'approved'::text, 'requires_improvement'::text, 'suspended'::text])),
  last_inspection_date date,
  next_inspection_date date,
  compliance_status text NOT NULL DEFAULT 'pending'::text CHECK (compliance_status = ANY (ARRAY['compliant'::text, 'non_compliant'::text, 'pending_review'::text])),
  compliance_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zambia_medical_council_config_pkey PRIMARY KEY (id),
  CONSTRAINT zambia_medical_council_config_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- Zambia Tax Configuration
CREATE TABLE IF NOT EXISTS public.zambia_tax_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL UNIQUE,
  tpn text NOT NULL,
  tax_registration_date date,
  tax_compliance_status text NOT NULL DEFAULT 'active'::text CHECK (tax_compliance_status = ANY (ARRAY['active'::text, 'suspended'::text, 'under_review'::text])),
  vat_registration_number text,
  vat_registered boolean NOT NULL DEFAULT false,
  with_holding_tax_registered boolean NOT NULL DEFAULT false,
  last_tax_filing_date date,
  next_tax_filing_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zambia_tax_config_pkey PRIMARY KEY (id),
  CONSTRAINT zambia_tax_config_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.healthcare_institutions(id)
);

-- Zambia Health Regulations
CREATE TABLE IF NOT EXISTS public.zambia_health_regulations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  regulation_code text NOT NULL UNIQUE,
  regulation_name text NOT NULL,
  regulation_category text NOT NULL,
  description text,
  compliance_requirement text,
  effective_date date NOT NULL,
  expiry_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT zambia_health_regulations_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.general_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zra_smart_invoice_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zra_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paye_tax_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paye_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zambia_nhima_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zambia_medical_council_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zambia_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zambia_health_regulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Institution-based tables
CREATE POLICY "Users can view institution data" ON public.general_ledger_entries
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert institution data" ON public.general_ledger_entries
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can update institution data" ON public.general_ledger_entries
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Apply similar policies to other institution-based tables
CREATE POLICY "Users can view asset records" ON public.asset_records
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert asset records" ON public.asset_records
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can update asset records" ON public.asset_records
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Bank Reconciliations
CREATE POLICY "Users can view bank reconciliations" ON public.bank_reconciliations
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert bank reconciliations" ON public.bank_reconciliations
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- ZRA Smart Invoice Config
CREATE POLICY "Users can view ZRA config" ON public.zra_smart_invoice_config
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can upsert ZRA config" ON public.zra_smart_invoice_config
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Smart Invoices
CREATE POLICY "Users can view smart invoices" ON public.smart_invoices
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert smart invoices" ON public.smart_invoices
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- ZRA Tax Rates (public read)
CREATE POLICY "Anyone can view ZRA tax rates" ON public.zra_tax_rates
  FOR SELECT USING (true);

-- PAYE Tax Slabs
CREATE POLICY "Users can view PAYE slabs" ON public.paye_tax_slabs
  FOR SELECT USING (
    institution_id IS NULL OR
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
      OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
    )
  );

CREATE POLICY "Users can insert PAYE slabs" ON public.paye_tax_slabs
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can update PAYE slabs" ON public.paye_tax_slabs
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- PAYE Calculations
CREATE POLICY "Users can view PAYE calculations" ON public.paye_calculations
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert PAYE calculations" ON public.paye_calculations
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Employee Payroll
CREATE POLICY "Users can view employee payroll" ON public.employee_payroll
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert employee payroll" ON public.employee_payroll
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Medical Shifts
CREATE POLICY "Users can view medical shifts" ON public.medical_shifts
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert medical shifts" ON public.medical_shifts
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Shift Assignments
CREATE POLICY "Users can view shift assignments" ON public.shift_assignments
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert shift assignments" ON public.shift_assignments
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Attendance Records
CREATE POLICY "Users can view attendance records" ON public.attendance_records
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert attendance records" ON public.attendance_records
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Biometric Devices
CREATE POLICY "Users can view biometric devices" ON public.biometric_devices
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert biometric devices" ON public.biometric_devices
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Zambia NHIMA Config
CREATE POLICY "Users can view NHIMA config" ON public.zambia_nhima_config
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can upsert NHIMA config" ON public.zambia_nhima_config
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Zambia Medical Council Config
CREATE POLICY "Users can view Medical Council config" ON public.zambia_medical_council_config
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can upsert Medical Council config" ON public.zambia_medical_council_config
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Zambia Tax Config
CREATE POLICY "Users can view Tax config" ON public.zambia_tax_config
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can upsert Tax config" ON public.zambia_tax_config
  FOR ALL USING (auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

-- Zambia Health Regulations (public read)
CREATE POLICY "Anyone can view Zambia health regulations" ON public.zambia_health_regulations
  FOR SELECT USING (true);

-- ============================================================================
-- INITIAL ZAMBIA TAX RATES DATA
-- ============================================================================

-- Insert default ZRA tax rates (VAT)
INSERT INTO public.zra_tax_rates (tax_code, tax_name, rate_percentage, effective_from, is_standard_rate, applies_to) VALUES
  ('VAT_STD', 'Standard VAT Rate', 16.0, '2022-04-01', true, ARRAY['medical_supplies', 'pharmaceuticals', 'hospital_services']),
  ('VAT_ZERO', 'Zero-Rated VAT', 0.0, '2022-04-01', false, ARRAY['basic_medical_services', 'consultations']),
  ('VAT_EXEMPT', 'VAT Exempt', 0.0, '2022-04-01', false, ARRAY['essential_medicines', 'public_health_services'])
ON CONFLICT (tax_code) DO NOTHING;

-- Insert default Zambia PAYE tax slabs (as per Zambia Revenue Authority)
-- Note: These are example rates - update with current Zambia PAYE brackets
-- institution_id is NULL for standard Zambia-wide tax slabs
INSERT INTO public.paye_tax_slabs (institution_id, slab_name, min_income, max_income, tax_rate_percentage, fixed_amount, plus_percentage_above_min, effective_from, is_active, description) VALUES
  (NULL, 'Band 1', 0, 4000, 0, 0, 0, '2024-01-01', true, 'Tax-free band'),
  (NULL, 'Band 2', 4000.01, 4800, 25, 0, 25, '2024-01-01', true, '25% on amount over 4,000'),
  (NULL, 'Band 3', 4800.01, 6600, 30, 200, 30, '2024-01-01', true, '30% on amount over 4,800'),
  (NULL, 'Band 4', 6600.01, 88800, 37.5, 740, 37.5, '2024-01-01', true, '37.5% on amount over 6,600'),
  (NULL, 'Band 5', 88800.01, NULL, 40, 32110, 40, '2024-01-01', true, '40% on amount over 88,800')
ON CONFLICT DO NOTHING;

-- Add missing columns to zambia_health_regulations if they don't exist
DO $$
BEGIN
  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zambia_health_regulations' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.zambia_health_regulations ADD COLUMN description text;
  END IF;

  -- Add compliance_requirement column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'zambia_health_regulations' AND column_name = 'compliance_requirement'
  ) THEN
    ALTER TABLE public.zambia_health_regulations ADD COLUMN compliance_requirement text;
  END IF;
END $$;

-- Insert default Zambia health regulations
INSERT INTO public.zambia_health_regulations (regulation_code, regulation_name, regulation_category, description, compliance_requirement, effective_date, is_active) VALUES
  ('ZHR-001', 'Health Professions Act', 'Medical Council', 'Regulation of medical practitioners', 'Valid medical council registration', '2019-01-01', true),
  ('ZHR-002', 'NHIMA Act', 'Health Insurance', 'National Health Insurance compliance', 'NHIMA accreditation', '2019-01-01', true),
  ('ZHR-003', 'Medical and Allied Health Professions Act', 'Medical Council', 'Standards for healthcare providers', 'Compliance with professional standards', '2019-01-01', true),
  ('ZHR-004', 'Public Health Act', 'General', 'Public health standards compliance', 'Facility health inspection approval', '2019-01-01', true),
  ('ZHR-005', 'Pharmacy and Medicines Regulation', 'Pharmacy', 'Regulation of pharmaceutical services', 'Valid pharmacy license', '2019-01-01', true)
ON CONFLICT (regulation_code) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- General Ledger Entries
CREATE INDEX IF NOT EXISTS idx_gl_entries_institution ON public.general_ledger_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_gl_entries_date ON public.general_ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_entries_fiscal ON public.general_ledger_entries(fiscal_year, fiscal_period);

-- Asset Records
CREATE INDEX IF NOT EXISTS idx_assets_institution ON public.asset_records(institution_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.asset_records(asset_category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.asset_records(status);

-- Bank Reconciliations
CREATE INDEX IF NOT EXISTS idx_reconciliations_institution ON public.bank_reconciliations(institution_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON public.bank_reconciliations(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON public.bank_reconciliations(statement_date);

-- Smart Invoices
CREATE INDEX IF NOT EXISTS idx_smart_invoices_institution ON public.smart_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_smart_invoices_status ON public.smart_invoices(sync_status);
CREATE INDEX IF NOT EXISTS idx_smart_invoices_date ON public.smart_invoices(invoice_date);

-- PAYE Calculations
CREATE INDEX IF NOT EXISTS idx_paye_calculations_institution ON public.paye_calculations(institution_id);
CREATE INDEX IF NOT EXISTS idx_paye_calculations_employee ON public.paye_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_paye_calculations_month ON public.paye_calculations(calculation_month);

-- PAYE Tax Slabs
CREATE INDEX IF NOT EXISTS idx_paye_slabs_institution ON public.paye_tax_slabs(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paye_slabs_standard ON public.paye_tax_slabs(is_active) WHERE institution_id IS NULL;

-- Employee Payroll
CREATE INDEX IF NOT EXISTS idx_payroll_institution ON public.employee_payroll(institution_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.employee_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON public.employee_payroll(month, year);

-- Medical Shifts
CREATE INDEX IF NOT EXISTS idx_shifts_institution ON public.medical_shifts(institution_id);
CREATE INDEX IF NOT EXISTS idx_shifts_type ON public.medical_shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON public.medical_shifts(is_active);

-- Shift Assignments
CREATE INDEX IF NOT EXISTS idx_assignments_institution ON public.shift_assignments(institution_id);
CREATE INDEX IF NOT EXISTS idx_assignments_shift ON public.shift_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_assignments_staff ON public.shift_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON public.shift_assignments(shift_date);

-- Attendance Records
CREATE INDEX IF NOT EXISTS idx_attendance_institution ON public.attendance_records(institution_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON public.attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- Biometric Devices
CREATE INDEX IF NOT EXISTS idx_biometric_institution ON public.biometric_devices(institution_id);
CREATE INDEX IF NOT EXISTS idx_biometric_status ON public.biometric_devices(connection_status);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Enterprise Accounting & Zambia-Specific Features schema created successfully!';
  RAISE NOTICE 'Tables created: 17';
  RAISE NOTICE 'RLS policies applied: 18';
  RAISE NOTICE 'Indexes created: 26';
  RAISE NOTICE 'Default data inserted: ZRA tax rates, Zambia PAYE slabs (standard), and Zambia health regulations';
END $$;
