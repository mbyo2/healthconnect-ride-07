-- Provider-types sweep 2026-10-25: the provider_directory view's role filter
-- listed 26 professions but omitted 'optician' (added as the 27th profession
-- on 2026-10-20). An approved optician could therefore never appear in the
-- public directory, be discovered, or be booked. Recreate the view with the
-- full 27-profession list. Column set unchanged (P2-10: no email/phone);
-- CREATE OR REPLACE preserves the existing ACL.
CREATE OR REPLACE VIEW public.provider_directory AS
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
  WHERE ((is_verified = true) AND (show_in_search IS NOT FALSE) AND (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = p.id) AND (ur.role = ANY (ARRAY['doctor'::app_role, 'specialist'::app_role, 'medical_licentiate'::app_role, 'clinical_officer'::app_role, 'dentist'::app_role, 'dental_therapist'::app_role, 'nurse'::app_role, 'registered_nurse'::app_role, 'enrolled_nurse'::app_role, 'midwife'::app_role, 'pharmacist'::app_role, 'pharmacy_technologist'::app_role, 'radiologist'::app_role, 'radiographer'::app_role, 'pathologist'::app_role, 'lab_technician'::app_role, 'phlebotomist'::app_role, 'psychologist'::app_role, 'nutritionist'::app_role, 'optometrist'::app_role, 'physiotherapist'::app_role, 'occupational_therapist'::app_role, 'traditional_practitioner'::app_role, 'health_personnel'::app_role, 'environmental_health_officer'::app_role, 'community_health_worker'::app_role, 'optician'::app_role]))))));
