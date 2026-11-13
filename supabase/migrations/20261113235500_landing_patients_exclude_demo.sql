-- Landing "patients" metric: exclude demo/test signups (2026-11-13, CEO-approved).
--
-- Problem: get_public_platform_counts() counted every profiles row with
-- role 'patient', including the two demo signups created during early
-- development (doctor@healthconnect.com, me@me.com — gibberish names,
-- 2025-03 / 2025-04), so the landing page overstated real patients.
--
-- Fix: the patients count now excludes those two known demo emails, the
-- platform's own internal demo domain (@healthconnect.com — no real
-- patient holds such an address), and reserved example domains. No flag
-- column exists on profiles, so the exclusion is by explicit email list
-- plus these narrow domain patterns (deliberately NOT a '%test%'
-- substring match: that would wrongly exclude real addresses such as
-- 'latest...@gmail.com'). No accounts are deleted or modified — the
-- exclusion is count-only, inside this aggregate function.
--
-- Live verification 2026-11-13: patients 13 -> 11 (exactly the 2 demo
-- rows); doctors / hospitals / pharmacies / appointments unchanged.

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
    (SELECT count(*) FROM public.profiles
      WHERE role::text = 'patient'
        AND (email IS NULL
             OR (email NOT IN ('doctor@healthconnect.com', 'me@me.com')
                 AND email NOT ILIKE '%@healthconnect.com'
                 AND email NOT ILIKE '%@example.%'))),
    (SELECT count(*) FROM public.appointments);
$$;

REVOKE ALL ON FUNCTION public.get_public_platform_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_platform_counts() TO anon, authenticated, service_role;
