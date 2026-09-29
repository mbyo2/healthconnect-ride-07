-- Phase 1 (2026-09-29): provider signup pipeline — replace stale hardcoded
-- profession allowlists with the live provider_types table.
--
-- ROOT CAUSE: three auth-signup trigger functions hardcoded only a handful of
-- professions (doctor, nurse, pharmacist, lab_technician, radiologist,
-- health_personnel, ...). The other 19 of the 25 canonical professions
-- (specialist, medical_licentiate, clinical_officer, dentist,
-- dental_therapist, registered_nurse, enrolled_nurse, midwife,
-- pharmacy_technologist, radiographer, pathologist, physiotherapist,
-- occupational_therapist, nutritionist, optometrist, psychologist,
-- environmental_health_officer, community_health_worker,
-- traditional_practitioner) could create an auth account but got:
--   * NO health_personnel_applications row  -> nothing for admins to approve
--   * user_roles = 'patient'                -> stuck as patients forever
--   * profiles.role = 'patient'
--
-- FIX: all three functions now look up the profession in the ACTIVE
-- provider_types table instead of a hardcoded list, so any current or future
-- profession flows through signup -> application -> approval -> exact role
-- grant automatically. The existing approval trigger
-- (grant_provider_role_on_approval) already allowlists against
-- provider_types, so no change is needed there.
--
-- Behaviour is otherwise unchanged:
--   * privileged roles still can never come from signup metadata,
--   * provider signups still get profiles.role='health_personnel' as a
--     holding role with is_verified=false until an admin approves,
--   * the exact profession is still granted into user_roles at signup for
--     allowlisted professions (as the previous CASE did for the original 9),
--   * institution signups (pharmacy/lab/institution_admin) are untouched.
--
-- Idempotent: CREATE OR REPLACE; safe to re-run.

-- ── 1. auto_create_provider_application: create an application row ─────────
-- ──    for EVERY active provider_types profession ─────────────────────────
CREATE OR REPLACE FUNCTION public.auto_create_provider_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_raw_role text;
  v_license text;
  v_specialty text;
  v_business_name text;
  v_business_type text;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  -- Skip patients - they don't need applications
  IF v_raw_role = 'patient' THEN
    RETURN NEW;
  END IF;

  v_license := COALESCE(NEW.raw_user_meta_data->>'license_number', '');
  v_specialty := COALESCE(NEW.raw_user_meta_data->>'specialty', v_raw_role);
  v_business_name := NEW.raw_user_meta_data->>'business_name';
  v_business_type := NEW.raw_user_meta_data->>'business_type';

  -- Create health personnel application for individual providers.
  -- Any ACTIVE provider_types profession qualifies (no hardcoded list, so
  -- new professions work without a code change).
  IF EXISTS (
    SELECT 1 FROM public.provider_types pt
    WHERE pt.code = v_raw_role AND pt.is_active
  ) THEN
    INSERT INTO public.health_personnel_applications (
      user_id, license_number, specialty, years_of_experience, status, experience_level
    ) VALUES (
      NEW.id, v_license, v_specialty, 0, 'pending', 'entry'
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Create healthcare institution for businesses
  IF v_raw_role IN ('pharmacy', 'lab', 'institution_admin') AND v_business_name IS NOT NULL THEN
    INSERT INTO public.healthcare_institutions (
      admin_id, name, type, city, country, is_verified, license_number
    ) VALUES (
      NEW.id,
      v_business_name,
      CASE v_business_type
        WHEN 'pharmacy' THEN 'pharmacy'
        WHEN 'clinic' THEN 'clinic'
        WHEN 'specialized_clinic' THEN 'specialty_clinic'
        WHEN 'hospital' THEN 'hospital'
        WHEN 'large_hospital' THEN 'hospital'
        WHEN 'laboratory' THEN 'radiology_center'
        WHEN 'nursing_home' THEN 'nursing_home'
        WHEN 'diagnostic_center' THEN 'radiology_center'
        ELSE 'clinic'
      END::healthcare_provider_type,
      COALESCE(NEW.raw_user_meta_data->>'city', ''),
      COALESCE(NEW.raw_user_meta_data->>'country', 'Zambia'),
      false,
      v_license
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 2. assign_default_role: grant the exact profession for every ───────────
-- ──    active provider_types code (previously only 9 hardcoded) ───────────
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_raw_role text;
  v_app_role app_role;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  -- Privileged roles can NEVER come from client-supplied signup metadata.
  -- They must be granted by an existing admin or through the reviewed
  -- application / staff-invitation approval flows.
  IF v_raw_role IN (
    'admin', 'super_admin', 'support', 'cxo',
    'institution_staff', 'receptionist', 'hr_manager', 'billing_staff',
    'inventory_manager', 'maintenance_manager', 'ambulance_staff',
    'ot_staff', 'triage_staff'
  ) THEN
    v_raw_role := 'patient';
  END IF;

  -- Any active provider_types profession is granted its exact role at signup
  -- (approval is still required: profiles.is_verified stays false until an
  -- admin reviews the application). Falls back to the generic cadre if the
  -- code drifted out of the app_role enum.
  IF EXISTS (
    SELECT 1 FROM public.provider_types pt
    WHERE pt.code = v_raw_role AND pt.is_active
  ) THEN
    BEGIN
      v_app_role := v_raw_role::app_role;
    EXCEPTION WHEN invalid_text_representation THEN
      v_app_role := 'health_personnel';
    END;
  ELSIF v_raw_role IN ('pharmacy', 'lab', 'institution_admin') THEN
    v_app_role := v_raw_role::app_role;
  ELSE
    v_app_role := 'patient';
  END IF;

  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (NEW.id, v_app_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_app_role != 'patient' THEN
    INSERT INTO public.user_roles (user_id, role, granted_at)
    VALUES (NEW.id, 'patient', now())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 3. handle_new_user: holding profile role for every active ─────────────
-- ──    provider_types profession (previously only 9 hardcoded) ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_raw_role text;
  v_profile_role user_role;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');

  IF v_raw_role IN (
    'admin', 'super_admin', 'support', 'cxo',
    'institution_staff', 'receptionist', 'hr_manager', 'billing_staff',
    'inventory_manager', 'maintenance_manager', 'ambulance_staff',
    'ot_staff', 'triage_staff'
  ) THEN
    v_raw_role := 'patient';
  END IF;

  -- Provider and institution signups get the 'health_personnel' holding role
  -- until an admin approves their application; everyone else is a patient.
  IF EXISTS (
       SELECT 1 FROM public.provider_types pt
       WHERE pt.code = v_raw_role AND pt.is_active
     )
     OR v_raw_role IN ('pharmacy', 'lab', 'institution_admin') THEN
    v_profile_role := 'health_personnel';
  ELSE
    v_profile_role := 'patient';
  END IF;

  INSERT INTO public.profiles (
    id, email, first_name, last_name, role, phone, specialty,
    is_verified, is_profile_complete, city
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_profile_role,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'specialty',
    CASE WHEN v_raw_role = 'patient' THEN true ELSE false END,
    false,
    NEW.raw_user_meta_data->>'city'
  );
  RETURN NEW;
END;
$function$;
