
-- 2. Replace handle_new_user to correctly map roles and set is_verified
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
  
  -- Map detailed roles to the simpler profiles.role enum (admin/health_personnel/patient)
  IF v_raw_role IN ('doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiologist', 'health_personnel') THEN
    v_profile_role := 'health_personnel';
  ELSIF v_raw_role IN ('pharmacy', 'lab', 'institution_admin', 'institution_staff') THEN
    v_profile_role := 'health_personnel';
  ELSIF v_raw_role = 'admin' THEN
    v_profile_role := 'admin';
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
    -- Only patients are auto-verified
    CASE WHEN v_raw_role = 'patient' THEN true ELSE false END,
    false,
    NEW.raw_user_meta_data->>'city'
  );
  RETURN NEW;
END;
$function$;

-- 3. Replace assign_default_role to assign the CORRECT role from metadata
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
  
  -- Map the raw role to app_role enum
  CASE v_raw_role
    WHEN 'doctor' THEN v_app_role := 'doctor';
    WHEN 'nurse' THEN v_app_role := 'nurse';
    WHEN 'pharmacist' THEN v_app_role := 'pharmacist';
    WHEN 'lab_technician' THEN v_app_role := 'lab_technician';
    WHEN 'radiologist' THEN v_app_role := 'radiologist';
    WHEN 'pharmacy' THEN v_app_role := 'pharmacy';
    WHEN 'lab' THEN v_app_role := 'lab';
    WHEN 'institution_admin' THEN v_app_role := 'institution_admin';
    WHEN 'institution_staff' THEN v_app_role := 'institution_staff';
    WHEN 'health_personnel' THEN v_app_role := 'health_personnel';
    WHEN 'admin' THEN v_app_role := 'admin';
    ELSE v_app_role := 'patient';
  END CASE;
  
  -- Always assign the specific role
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (NEW.id, v_app_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Also assign patient role for non-patients (so they can use patient features too)
  IF v_app_role != 'patient' THEN
    INSERT INTO public.user_roles (user_id, role, granted_at)
    VALUES (NEW.id, 'patient', now())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Create trigger function to auto-create applications for providers
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
  
  -- Create health personnel application for individual providers
  IF v_raw_role IN ('doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiologist', 'health_personnel') THEN
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

-- 5. Attach the trigger (after handle_new_user and assign_default_role)
DROP TRIGGER IF EXISTS on_auth_user_created_application ON auth.users;
CREATE TRIGGER on_auth_user_created_application
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_provider_application();
