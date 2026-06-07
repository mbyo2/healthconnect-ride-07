
-- analytics_events --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_name text NOT NULL,
  path text,
  props jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON public.analytics_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON public.analytics_events (event_name, occurred_at DESC);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can read analytics" ON public.analytics_events;
CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- medical_record_audit ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_record_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid,
  patient_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  payload_hash text NOT NULL,
  prev_hash text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS medical_record_audit_patient_idx ON public.medical_record_audit (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS medical_record_audit_record_idx ON public.medical_record_audit (record_id, created_at DESC);
GRANT SELECT ON public.medical_record_audit TO authenticated;
GRANT ALL ON public.medical_record_audit TO service_role;
ALTER TABLE public.medical_record_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Patients view own audit chain" ON public.medical_record_audit;
CREATE POLICY "Patients view own audit chain"
  ON public.medical_record_audit FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- service_pricing ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid,
  service_code text NOT NULL,
  service_label text NOT NULL,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZMW',
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_pricing_inst_idx ON public.service_pricing (institution_id, is_active);
CREATE INDEX IF NOT EXISTS service_pricing_code_idx ON public.service_pricing (service_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_pricing TO authenticated;
GRANT ALL ON public.service_pricing TO service_role;
ALTER TABLE public.service_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read service pricing" ON public.service_pricing;
CREATE POLICY "Anyone signed in can read service pricing"
  ON public.service_pricing FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Institution admins manage pricing" ON public.service_pricing;
CREATE POLICY "Institution admins manage pricing"
  ON public.service_pricing FOR ALL TO authenticated
  USING (
    institution_id IS NULL OR
    public.is_institution_admin(institution_id) OR
    public.is_institution_staff_member(institution_id) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    institution_id IS NULL OR
    public.is_institution_admin(institution_id) OR
    public.is_institution_staff_member(institution_id) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'super_admin')
  );
DROP TRIGGER IF EXISTS service_pricing_set_updated_at ON public.service_pricing;
CREATE TRIGGER service_pricing_set_updated_at
  BEFORE UPDATE ON public.service_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- provider_insurance_networks --------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_insurance_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  insurer_name text NOT NULL,
  plan_codes text[] NOT NULL DEFAULT '{}',
  is_in_network boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, insurer_name)
);
CREATE INDEX IF NOT EXISTS pin_provider_idx ON public.provider_insurance_networks (provider_id);
CREATE INDEX IF NOT EXISTS pin_insurer_idx ON public.provider_insurance_networks (insurer_name);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_insurance_networks TO authenticated;
GRANT SELECT ON public.provider_insurance_networks TO anon;
GRANT ALL ON public.provider_insurance_networks TO service_role;
ALTER TABLE public.provider_insurance_networks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read provider networks" ON public.provider_insurance_networks;
CREATE POLICY "Public can read provider networks"
  ON public.provider_insurance_networks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Provider manages own networks" ON public.provider_insurance_networks;
CREATE POLICY "Provider manages own networks"
  ON public.provider_insurance_networks FOR ALL TO authenticated
  USING (provider_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (provider_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
DROP TRIGGER IF EXISTS pin_set_updated_at ON public.provider_insurance_networks;
CREATE TRIGGER pin_set_updated_at
  BEFORE UPDATE ON public.provider_insurance_networks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
