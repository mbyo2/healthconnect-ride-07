-- Public provider directory for Doc'O Clock (Zocdoc-style discovery).
--
-- Problem: patient/anonymous provider search queried public.profiles directly.
--   1) anon got "permission denied for function has_role" (401) because EXECUTE
--      on has_role was revoked from anon/PUBLIC;
--   2) no RLS policy ever allowed patients or anon to read verified provider
--      profiles, so /search always returned "No verified providers found";
--   3) the app selects phantom columns (bio, country) that do not exist.
--
-- Fix: a SECURITY DEFINER view exposing only directory-safe columns of
-- verified, searchable providers, readable by anon + authenticated.
-- Sensitive columns (date_of_birth, gender, address, admin_level, privacy
-- flags) are never exposed. Verification + show_in_search are the consent gates.

-- 1) Let anon evaluate has_role() (always false for anon: auth.uid() IS NULL)
-- instead of erroring the whole query with 401.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- 2) Public directory view. security_invoker=false => runs as the view owner,
-- bypassing RLS on the underlying table, but only the listed columns escape.
CREATE OR REPLACE VIEW public.provider_directory
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.specialty,
  p.subspecialties,
  p.provider_type,
  p.avatar_url,
  p.email,
  p.phone,
  p.years_experience,
  p.rating,
  p.reviews_count,
  p.role,
  p.accepted_insurances,
  p.medical_school,
  p.graduation_year,
  p.board_certifications,
  p.primary_practice_location,
  p.affiliated_hospitals,
  p.consultation_fee_min,
  p.consultation_fee_max,
  p.accepts_insurance,
  p.insurance_providers_accepted,
  p.telemedicine_available,
  p.home_visits_available,
  p.languages_spoken,
  p.typical_wait_time,
  p.appointment_types,
  p.availability_schedule,
  p.accepting_patients,
  p.location,
  p.city,
  p.state,
  p.is_verified
FROM public.profiles p
WHERE p.is_verified = true
  AND (p.show_in_search IS NOT FALSE);

GRANT SELECT ON public.provider_directory TO anon, authenticated;
