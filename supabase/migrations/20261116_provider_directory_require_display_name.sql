-- Patient flows (doc swarm 2026-11-16, group 1): provider_directory must
-- not list providers with no display name.
--
-- Bug (proven live 2026-11-16 by JWT replay as a patient): the view
-- listed 45 rows, of which 9 have EMPTY first_name AND last_name (and
-- NULL specialty) yet is_verified=true and accepting_patients=true, so
-- find-a-doctor (HealthcareProfessionals) and the Patient Home featured
-- rail render blank "provider" cards with a Book action and no name.
-- One of the 9 is the gate14 doctor QA account, created without name
-- metadata; the others are profiles created the same way (handle_new_user
-- defaults first/last name to '' when raw_user_meta_data carries none).
--
-- Fix: require a non-empty display name (first or last name after trim).
-- Named providers with no specialty stay listed — only the blank cards go.
-- Read-only proof before this migration: the same predicate keeps 36 of
-- 45 rows live and drops exactly the 9 blank ones.
--
-- NOT applied live during the swarm: the directory is shared by all six
-- swarm groups and the parent's live-browser tour (gate14 doctor is one
-- of the 9 blank rows). The coordinator applies this at merge.
CREATE OR REPLACE VIEW public.provider_directory
WITH (security_invoker = false) AS
 SELECT id,
    first_name,
    last_name,
    specialty,
    subspecialties,
    provider_type,
    avatar_url,
    years_experience,
    rating,
    reviews_count,
    role,
    accepted_insurances,
    medical_school,
    graduation_year,
    board_certifications,
    primary_practice_location,
    affiliated_hospitals,
    consultation_fee_min,
    consultation_fee_max,
    accepts_insurance,
    insurance_providers_accepted,
    telemedicine_available,
    home_visits_available,
    languages_spoken,
    typical_wait_time,
    appointment_types,
    availability_schedule,
    accepting_patients,
    location,
    city,
    state,
    is_verified
   FROM profiles p
  WHERE is_verified = true
    AND show_in_search IS NOT FALSE
    AND (NULLIF(btrim(COALESCE(p.first_name, '')), '') IS NOT NULL
      OR NULLIF(btrim(COALESCE(p.last_name, '')), '') IS NOT NULL)
    AND (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ur.user_id = p.id AND (ur.role = ANY (ARRAY['doctor'::app_role, 'specialist'::app_role, 'medical_licentiate'::app_role, 'clinical_officer'::app_role, 'dentist'::app_role, 'dental_therapist'::app_role, 'nurse'::app_role, 'registered_nurse'::app_role, 'enrolled_nurse'::app_role, 'midwife'::app_role, 'pharmacist'::app_role, 'pharmacy_technologist'::app_role, 'radiologist'::app_role, 'radiographer'::app_role, 'pathologist'::app_role, 'lab_technician'::app_role, 'phlebotomist'::app_role, 'psychologist'::app_role, 'nutritionist'::app_role, 'optometrist'::app_role, 'physiotherapist'::app_role, 'occupational_therapist'::app_role, 'traditional_practitioner'::app_role, 'health_personnel'::app_role, 'environmental_health_officer'::app_role, 'community_health_worker'::app_role, 'optician'::app_role]))));

GRANT SELECT ON public.provider_directory TO anon, authenticated;
