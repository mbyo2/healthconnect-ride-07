-- ============================================================================
-- ZRA SMART INVOICE VSDC FISCAL SUBMISSION SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. INSTITUTION SMART INVOICE SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_smart_invoice_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) UNIQUE,

  -- Status and Environment
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'pending_setup', 'sandbox', 'active', 'suspended', 'error')),
  environment text CHECK (environment IN ('sandbox', 'production')),

  -- ZRA Registration Details
  tpin text,
  bhf_id text,
  device_serial_number text,
  legal_business_name text,
  authorized_contact_email text,
  authorized_contact_phone text,

  -- VSDC Configuration
  vsdc_base_url text,
  vsdc_internal_url text,
  container_reference text,
  secret_reference text,

  -- Encrypted credentials (store reference only, not actual keys)
  encrypted_credentials jsonb,

  -- Initialization and Health
  initialized_at timestamptz,
  last_health_check_at timestamptz,
  last_error text,
  next_retry_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT institution_smart_invoice_settings_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 2. FISCAL SUBMISSIONS TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fiscal_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id),
  invoice_id uuid NOT NULL REFERENCES public.payments(id),

  -- Submission Status
  status text NOT NULL DEFAULT 'not_required' CHECK (status IN ('not_required', 'queued', 'submitted', 'accepted', 'rejected', 'retrying', 'error')),
  attempt_count integer NOT NULL DEFAULT 0,
  idempotency_key uuid NOT NULL DEFAULT gen_random_uuid(),

  -- Request/Response Payloads
  request_payload jsonb,
  response_payload jsonb,
  zra_result_code text,
  zra_result_message text,
  zra_invoice_number text,

  -- Timestamps
  submitted_at timestamptz,
  accepted_at timestamptz,
  next_retry_at timestamptz,
  last_error text,

  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT fiscal_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT fiscal_submissions_invoice_unique UNIQUE (invoice_id)
);

-- ============================================================================
-- 3. ZRA ITEM MAPPINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.institution_zra_item_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id),
  catalog_item_id uuid NOT NULL,

  -- ZRA Item Details
  zra_item_code text NOT NULL,
  zra_item_class_code text,
  zra_item_type_code text,
  tax_type_code text,
  quantity_unit_code text,
  package_unit_code text,
  default_price numeric,

  -- Sync Status
  synced_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT institution_zra_item_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT institution_zra_item_mappings_unique UNIQUE (institution_id, catalog_item_id)
);

-- ============================================================================
-- 4. VSDC OPERATION LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vsdc_operation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id),

  -- Operation Details
  operation_type text NOT NULL CHECK (operation_type IN ('initialize', 'sync_codes', 'sync_items', 'submit_sale', 'health_check', 'sync_code_map')),
  operation_status text NOT NULL CHECK (operation_status IN ('success', 'error', 'retrying')),

  -- Request/Response
  request_payload jsonb,
  response_payload jsonb,
  error_message text,

  -- Timing
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,

  -- Audit
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),

  CONSTRAINT vsdc_operation_logs_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.institution_smart_invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_zra_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vsdc_operation_logs ENABLE ROW LEVEL SECURITY;

-- Institution Smart Invoice Settings
CREATE POLICY "Users can view own institution settings" ON public.institution_smart_invoice_settings
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert own institution settings" ON public.institution_smart_invoice_settings
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
  ));

CREATE POLICY "Users can update own institution settings" ON public.institution_smart_invoice_settings
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
  ));

-- Restrict encrypted_credentials to server-only
CREATE POLICY "Server can view encrypted credentials" ON public.institution_smart_invoice_settings
  FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Fiscal Submissions
CREATE POLICY "Users can view own institution submissions" ON public.fiscal_submissions
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Service can insert fiscal submissions" ON public.fiscal_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update fiscal submissions" ON public.fiscal_submissions
  FOR UPDATE USING (true);

-- ZRA Item Mappings
CREATE POLICY "Users can view own institution mappings" ON public.institution_zra_item_mappings
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Users can insert own institution mappings" ON public.institution_zra_item_mappings
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
  ));

CREATE POLICY "Users can update own institution mappings" ON public.institution_zra_item_mappings
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
  ));

-- VSDC Operation Logs
CREATE POLICY "Users can view own institution logs" ON public.vsdc_operation_logs
  FOR SELECT USING (auth.uid() IN (
    SELECT id FROM auth.users
    WHERE id IN (SELECT admin_id FROM public.healthcare_institutions WHERE id = institution_id)
    OR id IN (SELECT user_id FROM public.institution_personnel WHERE institution_id = institution_id)
  ));

CREATE POLICY "Service can insert operation logs" ON public.vsdc_operation_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Institution Smart Invoice Settings
CREATE INDEX IF NOT EXISTS idx_smart_invoice_institution ON public.institution_smart_invoice_settings(institution_id);
CREATE INDEX IF NOT EXISTS idx_smart_invoice_status ON public.institution_smart_invoice_settings(status);

-- Fiscal Submissions
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_institution ON public.fiscal_submissions(institution_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_invoice ON public.fiscal_submissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_status ON public.fiscal_submissions(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_submissions_next_retry ON public.fiscal_submissions(next_retry_at) WHERE status = 'retrying';

-- ZRA Item Mappings
CREATE INDEX IF NOT EXISTS idx_zra_mappings_institution ON public.institution_zra_item_mappings(institution_id);
CREATE INDEX IF NOT EXISTS idx_zra_mappings_item ON public.institution_zra_item_mappings(catalog_item_id);
CREATE INDEX IF NOT EXISTS idx_zra_mappings_code ON public.institution_zra_item_mappings(zra_item_code);

-- VSDC Operation Logs
CREATE INDEX IF NOT EXISTS idx_vsdc_logs_institution ON public.vsdc_operation_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_vsdc_logs_type ON public.vsdc_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_vsdc_logs_status ON public.vsdc_operation_logs(operation_status);
CREATE INDEX IF NOT EXISTS idx_vsdc_logs_created ON public.vsdc_operation_logs(created_at);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'ZRA Smart Invoice VSDC Fiscal Schema created successfully!';
  RAISE NOTICE 'Tables created: 4';
  RAISE NOTICE 'RLS policies applied: 11';
  RAISE NOTICE 'Indexes created: 12';
END $$;
