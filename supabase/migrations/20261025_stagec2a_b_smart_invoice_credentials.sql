-- Stage C2a Cluster B — P2-14: institution_smart_invoice_settings
-- .encrypted_credentials was readable by any institution personnel.
--
-- Live state before this migration: the SELECT policy
-- "Users can view own institution settings" read
--   auth.uid() IN (SELECT id FROM auth.users WHERE id IN
--     (SELECT admin_id FROM healthcare_institutions WHERE id = institution_id)
--     OR id IN (SELECT user_id FROM institution_personnel
--               WHERE institution_id = institution_id))   -- self-comparison!
-- The personnel subquery compares institution_personnel.institution_id
-- to ITSELF, so it is true for every row: ANY user holding ANY
-- personnel row anywhere could read EVERY institution's settings row,
-- including the encrypted_credentials jsonb (ZRA VSDC device
-- credentials). Postgres RLS is row-level, so the column cannot be
-- carved out of the row for broad readers.
--
-- Existing write posture (kept): INSERT and UPDATE policies already
-- restrict to the institution owner (healthcare_institutions.admin_id);
-- a service-role SELECT policy ("Server can view encrypted
-- credentials") already serves the backend.
--
-- Fix (least-breaking, mirrors the write posture):
--   * Table SELECT is restricted to the institution owner and platform
--     super_admin (the ZRA settings page, ZraSmartInvoiceIntegration,
--     is an owner-facing configuration surface; its form only uses
--     non-credential fields but runs as the owner).
--   * Ordinary institution personnel who need the non-credential
--     settings (status, environment, health-check state) get them via
--     the SECURITY DEFINER getter get_smart_invoice_settings_public(),
--     which returns the row as jsonb MINUS encrypted_credentials and
--     only to staff members / the owner of that institution.

DROP POLICY IF EXISTS "Users can view own institution settings"
  ON public.institution_smart_invoice_settings;

CREATE POLICY "Institution owners can view their settings"
  ON public.institution_smart_invoice_settings
  FOR SELECT
  TO public
  USING (
    public.is_institution_admin(institution_id)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.get_smart_invoice_settings_public(p_institution_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_institution_admin(p_institution_id)
      OR public.is_institution_staff_member(p_institution_id)
      OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    THEN (
      SELECT to_jsonb(s) - 'encrypted_credentials'
      FROM public.institution_smart_invoice_settings s
      WHERE s.institution_id = p_institution_id
    )
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.get_smart_invoice_settings_public(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_smart_invoice_settings_public(uuid) TO authenticated;
