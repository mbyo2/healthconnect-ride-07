-- P2-10 (Stage B audit): the public provider_directory exposed verified
-- providers' PERSONAL email + phone to ANONYMOUS visitors. The public
-- profile page (/provider/:id, no auth) rendered a Contact section with
-- both, and the raw values were one anon REST call away for every
-- verified provider on the platform.
--
-- Decision: taken 2026-10-25 under the CEO's standing instruction
-- ("choose what is best and most secure" + "continue even if I am not
-- online until our projects are completed"). The CEO was offered this
-- decision twice (2026-10-24 20:24 and 23:41 CAT, recommendation:
-- REMOVE both). This is a view/UI-layer change only — the underlying
-- profiles columns are untouched, so it is fully reversible if he
-- directs otherwise.
--
-- Fix shape:
--  * Recreate provider_directory WITHOUT email and phone. The view is
--    the only anonymous surface carrying provider contact data
--    (enumerated live 2026-10-25: institution_staff_directory carries
--    no contact columns; the only anon-executable RPCs are aggregate /
--    slot / token-gated helpers; base tables are RLS-gated with no
--    anon-permissive policy).
--  * CREATE OR REPLACE VIEW cannot drop columns, so DROP + CREATE.
--    Nothing depends on the view (verified: only its own rewrite rule).
--  * Normalise grants on the recreated view: SELECT only for anon and
--    authenticated. The live view carried default-privilege INSERT /
--    UPDATE / DELETE / TRUNCATE grants for anon + authenticated —
--    inert without INSTEAD OF triggers (none exist), but wrong on a
--    public object; service_role / postgres keep their defaults.
--
-- Authenticated care flows are NOT starved:
--  * Booking, search, map, prescriptions and appointment lists read
--    name / specialty / fees from the directory — unchanged.
--  * A patient's own appointment participants still read each other's
--    profiles rows under the existing "Appointment participants can
--    view each other's profiles" RLS policy — that path never came
--    from the directory and is untouched.
--  * In-app messaging (/chat) is the designed contact path and is
--    untouched.

DROP VIEW public.provider_directory;

CREATE VIEW public.provider_directory
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.specialty,
  p.subspecialties,
  p.provider_type,
  p.avatar_url,
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

REVOKE ALL ON public.provider_directory FROM anon, authenticated;
GRANT SELECT ON public.provider_directory TO anon, authenticated;
