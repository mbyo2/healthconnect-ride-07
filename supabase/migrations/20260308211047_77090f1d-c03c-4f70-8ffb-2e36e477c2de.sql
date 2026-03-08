
-- ============================================
-- 1. Hospital-wide Inventory (beyond pharmacy)
-- ============================================
CREATE TABLE IF NOT EXISTS public.hospital_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'consumable', -- consumable, surgical, linen, ppe, equipment, pharmaceutical, biomedical
  subcategory TEXT,
  sku TEXT,
  barcode TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_cost NUMERIC(12,2) DEFAULT 0,
  supplier TEXT,
  location TEXT, -- ward, store, OT, etc.
  expiry_date DATE,
  last_restocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hospital_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view inventory" ON public.hospital_inventory
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id));

CREATE POLICY "Institution staff can manage inventory" ON public.hospital_inventory
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

-- ============================================
-- 2. Asset Register + Work Orders (Maintenance)
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_tag TEXT,
  category TEXT NOT NULL DEFAULT 'medical_equipment', -- medical_equipment, hvac, electrical, plumbing, it_network, furniture, biomedical
  location TEXT,
  manufacturer TEXT,
  model_number TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  warranty_expiry DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  status TEXT DEFAULT 'operational', -- operational, needs_repair, under_maintenance, decommissioned
  condition TEXT DEFAULT 'good', -- excellent, good, fair, poor
  assigned_department TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.asset_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view assets" ON public.asset_register
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id));

CREATE POLICY "Institution staff can manage assets" ON public.asset_register
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.asset_register(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- electrical, plumbing, hvac, medical_equipment, structural, it_network, biomedical, general
  priority TEXT NOT NULL DEFAULT 'medium', -- critical, high, medium, low
  status TEXT NOT NULL DEFAULT 'open', -- open, assigned, in_progress, on_hold, completed, cancelled
  location TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  reported_by UUID REFERENCES auth.users(id),
  estimated_cost NUMERIC(12,2),
  actual_cost NUMERIC(12,2),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view work orders" ON public.work_orders
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id));

CREATE POLICY "Institution staff can manage work orders" ON public.work_orders
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

-- ============================================
-- 3. Ambulance Dispatch with GPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.ambulance_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id),
  patient_name TEXT NOT NULL,
  contact_phone TEXT,
  pickup_location TEXT NOT NULL,
  pickup_lat NUMERIC(10,7),
  pickup_lng NUMERIC(10,7),
  destination TEXT NOT NULL,
  destination_lat NUMERIC(10,7),
  destination_lng NUMERIC(10,7),
  ambulance_unit TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'urgent', -- emergency, urgent, routine
  status TEXT NOT NULL DEFAULT 'dispatched', -- dispatched, en_route, on_scene, transporting, delivered, completed, cancelled
  dispatcher_id UUID REFERENCES auth.users(id),
  crew_lead_id UUID REFERENCES auth.users(id),
  notes TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT now(),
  arrived_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_eta_minutes INTEGER,
  distance_km NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ambulance_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view dispatches" ON public.ambulance_dispatches
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can manage dispatches" ON public.ambulance_dispatches
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Pathologist Sign-off / Lab Oversight
-- ============================================
CREATE TABLE IF NOT EXISTS public.pathologist_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  lab_result_id UUID, -- reference to lab results (flexible due to dynamic tables)
  patient_name TEXT NOT NULL,
  test_name TEXT NOT NULL,
  result_value TEXT,
  reference_range TEXT,
  lab_tech_id UUID REFERENCES auth.users(id),
  lab_tech_name TEXT,
  pathologist_id UUID REFERENCES auth.users(id),
  pathologist_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review, reviewed, critical, released, rejected
  findings TEXT,
  clinical_significance TEXT, -- normal, abnormal, critical
  is_critical BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pathologist_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view reviews" ON public.pathologist_reviews
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id));

CREATE POLICY "Institution staff can manage reviews" ON public.pathologist_reviews
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

-- ============================================
-- 5. Specialist Session Templates (Dialysis, IVF, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.specialist_session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  specialty_type TEXT NOT NULL, -- dialysis, ivf, chemotherapy, physiotherapy, radiation_therapy
  template_name TEXT NOT NULL,
  protocol_steps JSONB DEFAULT '[]'::jsonb,
  default_duration_minutes INTEGER DEFAULT 60,
  required_equipment TEXT[],
  pre_session_checklist JSONB DEFAULT '[]'::jsonb,
  post_session_checklist JSONB DEFAULT '[]'::jsonb,
  contraindications TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.specialist_session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view templates" ON public.specialist_session_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Institution staff can manage templates" ON public.specialist_session_templates
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

CREATE TABLE IF NOT EXISTS public.specialist_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.specialist_session_templates(id),
  patient_id UUID REFERENCES auth.users(id),
  patient_name TEXT NOT NULL,
  provider_id UUID REFERENCES auth.users(id),
  specialty_type TEXT NOT NULL,
  session_number INTEGER DEFAULT 1, -- e.g., dialysis session 12 of 36
  total_sessions INTEGER, -- planned total
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, paused
  vitals_before JSONB,
  vitals_after JSONB,
  medications_administered JSONB DEFAULT '[]'::jsonb,
  protocol_notes TEXT,
  complications TEXT,
  outcome TEXT, -- successful, partial, adverse_event
  session_date DATE NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  next_session_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.specialist_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institution staff can view sessions" ON public.specialist_sessions
  FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR patient_id = auth.uid());

CREATE POLICY "Institution staff can manage sessions" ON public.specialist_sessions
  FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id))
  WITH CHECK (public.is_institution_staff_member(institution_id));

-- ============================================
-- 6. Multi-location institution hierarchy
-- ============================================
CREATE TABLE IF NOT EXISTS public.institution_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  branch_institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'branch', -- branch, satellite, affiliate
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_institution_id, branch_institution_id)
);

ALTER TABLE public.institution_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view branches" ON public.institution_branches
  FOR SELECT TO authenticated
  USING (public.is_institution_admin(parent_institution_id) OR public.is_institution_staff_member(parent_institution_id));

CREATE POLICY "Admin can manage branches" ON public.institution_branches
  FOR ALL TO authenticated
  USING (public.is_institution_admin(parent_institution_id))
  WITH CHECK (public.is_institution_admin(parent_institution_id));
