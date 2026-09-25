-- ============================================================
-- Doc'O Clock — per-institution module entitlements (modular HMS)
--
-- The facility_module_charter defines which modules belong to each
-- facility tier by default. This table stores ADMIN / SUPERADMIN
-- OVERRIDES per institution: when a hospital manager requests an
-- extra module (e.g. ICU, theatre, insurance claims), the platform
-- admin enables it here — no code change, no redeploy.
--
-- Effective state for a module = charter default for the
-- institution's tier, overlaid with the entitlement row (if any):
--   is_enabled = true   -> module is live for this institution
--                          (even when the charter marks it "planned")
--   is_enabled = false  -> module is suspended for this institution
--                          (even when the charter marks it "live")
-- No row -> charter default applies.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institution_module_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  module_name TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_institution_module_entitlements_inst
  ON public.institution_module_entitlements (institution_id);

ALTER TABLE public.institution_module_entitlements ENABLE ROW LEVEL SECURITY;

-- Admins / superadmins: full control (this is the module-grant surface).
DROP POLICY IF EXISTS "Admins manage module entitlements" ON public.institution_module_entitlements;
CREATE POLICY "Admins manage module entitlements"
ON public.institution_module_entitlements
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Institution admins and staff: read their own institution's entitlements.
DROP POLICY IF EXISTS "Institution members read own entitlements" ON public.institution_module_entitlements;
CREATE POLICY "Institution members read own entitlements"
ON public.institution_module_entitlements
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.healthcare_institutions hi
    WHERE hi.id = institution_module_entitlements.institution_id
      AND hi.admin_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.institution_staff ist
    WHERE ist.institution_id = institution_module_entitlements.institution_id
      AND ist.provider_id = auth.uid()
      AND ist.is_active = true
  )
);
