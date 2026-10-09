-- Fix provider_directory view: exclude non-provider profiles.
--
-- Bug (found 2026-10-09): the view selected ALL profiles with is_verified=true,
-- including PATIENTS. A patient account (clin-patient@doc0clock.qa) appeared in
-- the public /search as a "Verified" healthcare provider with "Book Consultation".
-- This is a privacy/security violation.
--
-- Root cause: the view only checked is_verified=true and show_in_search IS NOT FALSE.
-- It never verified the profile belongs to an actual healthcare provider.
--
-- Fix: only include profiles that hold a clinician/provider role in public.user_roles.
-- We check user_roles (the authoritative role table), NOT profiles.role (which is
-- unreliable — verified doctors carry role='patient' from the signup trigger default).
--
-- The view is security_invoker=false (runs as owner, bypasses RLS), so the
-- EXISTS subquery against user_roles is safe from RLS recursion.

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
  AND (p.show_in_search IS NOT FALSE)
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role IN (
        'doctor', 'specialist', 'medical_licentiate', 'clinical_officer',
        'dentist', 'dental_therapist',
        'nurse', 'registered_nurse', 'enrolled_nurse', 'midwife',
        'pharmacist', 'pharmacy_technologist',
        'radiologist', 'radiographer', 'pathologist', 'lab_technician', 'phlebotomist',
        'psychologist', 'nutritionist', 'optometrist',
        'physiotherapist', 'occupational_therapist',
        'traditional_practitioner', 'health_personnel',
        'environmental_health_officer', 'community_health_worker'
      )
  );

GRANT SELECT ON public.provider_directory TO anon, authenticated;
