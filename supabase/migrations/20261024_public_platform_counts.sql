-- Public landing-page aggregate counts (Stage A correction, 2026-10-24).
--
-- Problem: the landing page counted rows directly from profiles /
-- healthcare_institutions / appointments via PostgREST head-counts. RLS
-- returns 0 rows to anonymous visitors (and healthcare_institutions has no
-- anon SELECT grant at all -> 401), so every public stat rendered as a
-- dash even though the platform has real providers, patients and bookings.
--
-- Fix: ONE aggregate-only SECURITY DEFINER function. It exposes ONLY five
-- totals — no row data, no identifiers, nothing per-person — so anonymous
-- visitors can be shown real platform counts without widening any table's
-- RLS or grants.
--
-- Count definitions (unchanged product semantics, executed server-side):
--   doctors      = rows in public.provider_directory (the verified,
--                  show_in_search public directory). profiles.role cannot
--                  be used: the signup trigger defaults it to 'patient', so
--                  a role-based count reads 0 for the whole directory.
--   hospitals    = verified healthcare_institutions
--   pharmacies   = verified institutions of pharmacy premises types
--                  (hook's type list, restricted to values that exist in
--                  the healthcare_provider_type enum)
--   patients     = profiles with role 'patient'
--   appointments = all appointments

CREATE OR REPLACE FUNCTION public.get_public_platform_counts()
RETURNS TABLE (
  doctors bigint,
  hospitals bigint,
  pharmacies bigint,
  patients bigint,
  appointments bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.provider_directory),
    (SELECT count(*) FROM public.healthcare_institutions WHERE is_verified = true),
    (SELECT count(*) FROM public.healthcare_institutions
      WHERE is_verified = true
        AND type::text IN ('pharmacy', 'retail_pharmacy', 'hospital_pharmacy',
                           'wholesale_pharmacy', 'health_shop')),
    (SELECT count(*) FROM public.profiles WHERE role::text = 'patient'),
    (SELECT count(*) FROM public.appointments);
$$;

REVOKE ALL ON FUNCTION public.get_public_platform_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_counts() TO anon, authenticated, service_role;
