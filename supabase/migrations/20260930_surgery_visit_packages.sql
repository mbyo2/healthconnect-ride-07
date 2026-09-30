-- Surgery packages: bundled procedures with margin tracking.
--
-- A package bundles multiple tariff services (surgery + ward + lab + etc.)
-- into a single billable item with a package price. Margin = package price
-- minus the sum of component cost prices.

CREATE TABLE IF NOT EXISTS public.surgery_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  -- JSON array of { tariff_code, tariff_name, quantity, cost_price }
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Sum of component cost prices (computed at save time)
  total_cost numeric NOT NULL DEFAULT 0,
  -- The price charged to the patient
  package_price numeric NOT NULL,
  -- Margin = package_price - total_cost (computed at save time)
  margin numeric NOT NULL DEFAULT 0,
  margin_percent numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_surgery_packages_institution
  ON public.surgery_packages (institution_id, is_available);

ALTER TABLE public.surgery_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff read packages" ON public.surgery_packages;
CREATE POLICY "Institution staff read packages"
  ON public.surgery_packages FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Institution admins manage packages" ON public.surgery_packages;
CREATE POLICY "Institution admins manage packages"
  ON public.surgery_packages FOR ALL
  USING (
    institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

-- Multi-visit packages (e.g. dialysis 12-session bundle, physio 10-session bundle)
CREATE TABLE IF NOT EXISTS public.visit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  service_type text NOT NULL,
  total_visits integer NOT NULL CHECK (total_visits > 0),
  package_price numeric NOT NULL,
  -- Price per visit if bought individually (for savings display)
  single_visit_price numeric,
  validity_days integer,
  is_available boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_visit_packages_institution
  ON public.visit_packages (institution_id, is_available);

ALTER TABLE public.visit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution staff read visit packages" ON public.visit_packages;
CREATE POLICY "Institution staff read visit packages"
  ON public.visit_packages FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Institution admins manage visit packages" ON public.visit_packages;
CREATE POLICY "Institution admins manage visit packages"
  ON public.visit_packages FOR ALL
  USING (
    institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  )
  WITH CHECK (
    institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

-- Track package purchases/redemptions
CREATE TABLE IF NOT EXISTS public.package_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.visit_packages(id) ON DELETE SET NULL,
  surgery_package_id uuid REFERENCES public.surgery_packages(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES auth.users(id),
  visits_total integer NOT NULL DEFAULT 1,
  visits_used integer NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CHECK (package_id IS NOT NULL OR surgery_package_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_package_redemptions_patient
  ON public.package_redemptions (patient_id, status);

ALTER TABLE public.package_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients read own redemptions" ON public.package_redemptions;
CREATE POLICY "Patients read own redemptions"
  ON public.package_redemptions FOR SELECT
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Institution staff read redemptions" ON public.package_redemptions;
CREATE POLICY "Institution staff read redemptions"
  ON public.package_redemptions FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Institution staff manage redemptions" ON public.package_redemptions;
CREATE POLICY "Institution staff manage redemptions"
  ON public.package_redemptions FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM public.institution_staff WHERE provider_id = auth.uid()
    )
    OR institution_id IN (
      SELECT id FROM public.healthcare_institutions WHERE admin_id = auth.uid()
    )
  );
