-- Swarm 2026-11-24 — LP-1: institution settlement/identity columns move behind
-- admin-scoped RLS. Live evidence (audit-roles.md F-01): anon held column SELECT
-- on every healthcare_institutions column incl. bank_account_number, swift_code,
-- tax_id, license_number, admin_id, and ANY authenticated account could read all
-- verified institutions' rows. RLS cannot hide columns, so the data moves.
--
-- After this migration:
--  * the seven settlement/identity columns live in healthcare_institution_finance
--    (readable/writable only by that institution's admin or platform admin/super_admin);
--  * the base-table columns are nulled, and an AFTER trigger mirrors any legacy
--    write of them into the finance table so no writer can re-expose or lose data;
--  * anon keeps directory discovery via an explicit safe column list only.
-- admin_id stays on the base table: it is the institution-superadmin link that
-- policies and the sync trigger depend on.

CREATE TABLE IF NOT EXISTS public.healthcare_institution_finance (
  institution_id uuid PRIMARY KEY REFERENCES public.healthcare_institutions(id) ON DELETE CASCADE,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  swift_code text,
  tax_id text,
  business_registration_number text,
  license_number text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.healthcare_institution_finance
  (institution_id, bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number)
SELECT id, bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number
FROM public.healthcare_institutions
WHERE bank_name IS NOT NULL OR bank_account_number IS NOT NULL OR bank_account_name IS NOT NULL
   OR swift_code IS NOT NULL OR tax_id IS NOT NULL OR business_registration_number IS NOT NULL
   OR license_number IS NOT NULL
ON CONFLICT (institution_id) DO NOTHING;

ALTER TABLE public.healthcare_institution_finance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institution finance: admins manage" ON public.healthcare_institution_finance;
CREATE POLICY "Institution finance: admins manage" ON public.healthcare_institution_finance
  FOR ALL TO authenticated
  USING (public.is_institution_admin(institution_id) OR public.has_admin_scope(auth.uid()))
  WITH CHECK (public.is_institution_admin(institution_id) OR public.has_admin_scope(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.healthcare_institution_finance TO authenticated;
GRANT ALL ON public.healthcare_institution_finance TO service_role;

-- Mirror legacy writes of the sensitive columns into the finance table.
-- (Runs AFTER the row lands, so it never fights the trust-column guard:
-- a value can only be present if the guard already let it through.)
CREATE OR REPLACE FUNCTION public.zz_mirror_institution_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bank_name IS NOT NULL OR NEW.bank_account_number IS NOT NULL OR NEW.bank_account_name IS NOT NULL
     OR NEW.swift_code IS NOT NULL OR NEW.tax_id IS NOT NULL OR NEW.business_registration_number IS NOT NULL
     OR NEW.license_number IS NOT NULL THEN
    INSERT INTO public.healthcare_institution_finance
      (institution_id, bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number, updated_at)
    VALUES
      (NEW.id, NEW.bank_name, NEW.bank_account_number, NEW.bank_account_name, NEW.swift_code, NEW.tax_id, NEW.business_registration_number, NEW.license_number, now())
    ON CONFLICT (institution_id) DO UPDATE SET
      bank_name = COALESCE(EXCLUDED.bank_name, public.healthcare_institution_finance.bank_name),
      bank_account_number = COALESCE(EXCLUDED.bank_account_number, public.healthcare_institution_finance.bank_account_number),
      bank_account_name = COALESCE(EXCLUDED.bank_account_name, public.healthcare_institution_finance.bank_account_name),
      swift_code = COALESCE(EXCLUDED.swift_code, public.healthcare_institution_finance.swift_code),
      tax_id = COALESCE(EXCLUDED.tax_id, public.healthcare_institution_finance.tax_id),
      business_registration_number = COALESCE(EXCLUDED.business_registration_number, public.healthcare_institution_finance.business_registration_number),
      license_number = COALESCE(EXCLUDED.license_number, public.healthcare_institution_finance.license_number),
      updated_at = now();
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.zz_mirror_institution_finance() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_zz_mirror_institution_finance ON public.healthcare_institutions;
CREATE TRIGGER trg_zz_mirror_institution_finance
  AFTER INSERT OR UPDATE ON public.healthcare_institutions
  FOR EACH ROW EXECUTE FUNCTION public.zz_mirror_institution_finance();

-- Clear the base columns (this connection has no JWT, so the trust-column guard
-- exempts it; the mirror trigger sees only NULLs and does nothing).
UPDATE public.healthcare_institutions
SET bank_name = NULL, bank_account_number = NULL, bank_account_name = NULL,
    swift_code = NULL, tax_id = NULL, business_registration_number = NULL,
    license_number = NULL
WHERE bank_name IS NOT NULL OR bank_account_number IS NOT NULL OR bank_account_name IS NOT NULL
   OR swift_code IS NOT NULL OR tax_id IS NOT NULL OR business_registration_number IS NOT NULL
   OR license_number IS NOT NULL;

-- Anon discovery keeps working on safe columns only.
REVOKE SELECT ON public.healthcare_institutions FROM anon;
REVOKE SELECT (bank_name, bank_account_number, bank_account_name, swift_code, tax_id, business_registration_number, license_number, admin_id)
  ON public.healthcare_institutions FROM anon;
GRANT SELECT (id, name, type, address, city, state, country, postal_code, phone, email, website,
  operating_hours, is_verified, created_at, updated_at, currency, accepted_insurance_providers,
  list_in_marketplace, operational_since, number_of_beds, number_of_staff, emergency_services,
  ambulance_services, is_24_7, accreditation_body, accreditation_number, accreditation_expiry_date,
  services_offered, equipment_available, specialties, languages_spoken, latitude, longitude,
  verified, status, type_code, is_suspended, suspended_at, suspension_reason, payment_mode, country_code)
  ON public.healthcare_institutions TO anon;
