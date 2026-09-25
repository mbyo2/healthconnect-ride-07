-- ============================================================
-- Doc'O Clock — paid module add-ons: superadmin-set pricing
--
-- Each HMS module can carry a monthly add-on price, set exclusively by
-- the superadmin. price_monthly NULL (or is_billable = false) means the
-- module is included / not sold as an add-on. Institutions see the price
-- on their Modules & Add-ons card; the platform admin sees it when
-- granting the module, and the grant note records the price as the
-- billing trail.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institution_module_pricing (
  module_key TEXT PRIMARY KEY,
  module_name TEXT NOT NULL DEFAULT '',
  price_monthly NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  is_billable BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_module_pricing ENABLE ROW LEVEL SECURITY;

-- Superadmins: full control over add-on pricing.
DROP POLICY IF EXISTS "Superadmins manage module pricing" ON public.institution_module_pricing;
CREATE POLICY "Superadmins manage module pricing"
ON public.institution_module_pricing
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Admins: read pricing (so the grant UI can show it).
DROP POLICY IF EXISTS "Admins read module pricing" ON public.institution_module_pricing;
CREATE POLICY "Admins read module pricing"
ON public.institution_module_pricing
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Institutions: read pricing for their own effective modules (price
-- transparency on the Modules & Add-ons card).
DROP POLICY IF EXISTS "Institutions read module pricing" ON public.institution_module_pricing;
CREATE POLICY "Institutions read module pricing"
ON public.institution_module_pricing
FOR SELECT TO authenticated
USING (true);

-- Seed one row per known module so the superadmin has a full price list
-- to work through. Prices start NULL (unset) — nothing is sold until the
-- superadmin sets a price.
INSERT INTO public.institution_module_pricing (module_key, module_name, price_monthly, is_billable)
SELECT DISTINCT module_key, MIN(module_name), NULL, true
FROM public.facility_module_charter
GROUP BY module_key
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name;
