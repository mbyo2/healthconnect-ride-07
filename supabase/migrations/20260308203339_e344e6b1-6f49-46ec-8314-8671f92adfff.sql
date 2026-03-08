-- First add super_admin which was missing from enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Update assign_default_role to handle new roles
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
    WHEN 'receptionist' THEN v_app_role := 'receptionist';
    WHEN 'hr_manager' THEN v_app_role := 'hr_manager';
    WHEN 'cxo' THEN v_app_role := 'cxo';
    WHEN 'ot_staff' THEN v_app_role := 'ot_staff';
    WHEN 'phlebotomist' THEN v_app_role := 'phlebotomist';
    WHEN 'billing_staff' THEN v_app_role := 'billing_staff';
    WHEN 'inventory_manager' THEN v_app_role := 'inventory_manager';
    WHEN 'triage_staff' THEN v_app_role := 'triage_staff';
    WHEN 'maintenance_manager' THEN v_app_role := 'maintenance_manager';
    WHEN 'specialist' THEN v_app_role := 'specialist';
    WHEN 'ambulance_staff' THEN v_app_role := 'ambulance_staff';
    WHEN 'pathologist' THEN v_app_role := 'pathologist';
    ELSE v_app_role := 'patient';
  END CASE;
  
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

-- Update handle_new_user
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
  
  IF v_raw_role IN ('doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiologist', 'health_personnel', 'pathologist', 'phlebotomist', 'ot_staff', 'triage_staff', 'specialist') THEN
    v_profile_role := 'health_personnel';
  ELSIF v_raw_role IN ('pharmacy', 'lab', 'institution_admin', 'institution_staff', 'receptionist', 'hr_manager', 'cxo', 'billing_staff', 'inventory_manager', 'maintenance_manager', 'ambulance_staff') THEN
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
    CASE WHEN v_raw_role = 'patient' THEN true ELSE false END,
    false,
    NEW.raw_user_meta_data->>'city'
  );
  RETURN NEW;
END;
$function$;

-- Update get_user_roles priority
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
 RETURNS app_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ARRAY_AGG(role ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'cxo' THEN 3
      WHEN 'institution_admin' THEN 4
      WHEN 'institution_staff' THEN 5
      WHEN 'doctor' THEN 6
      WHEN 'nurse' THEN 7
      WHEN 'radiologist' THEN 8
      WHEN 'pathologist' THEN 9
      WHEN 'specialist' THEN 10
      WHEN 'health_personnel' THEN 11
      WHEN 'ot_staff' THEN 12
      WHEN 'triage_staff' THEN 13
      WHEN 'receptionist' THEN 14
      WHEN 'hr_manager' THEN 15
      WHEN 'billing_staff' THEN 16
      WHEN 'pharmacist' THEN 17
      WHEN 'pharmacy' THEN 18
      WHEN 'phlebotomist' THEN 19
      WHEN 'lab_technician' THEN 20
      WHEN 'lab' THEN 21
      WHEN 'inventory_manager' THEN 22
      WHEN 'maintenance_manager' THEN 23
      WHEN 'ambulance_staff' THEN 24
      WHEN 'patient' THEN 25
      ELSE 99
    END
  )
  FROM public.user_roles
  WHERE user_id = _user_id
$function$;

-- Update get_user_role priority
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role::text
      WHEN 'super_admin' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'support' THEN 2
      WHEN 'cxo' THEN 3
      WHEN 'institution_admin' THEN 4
      WHEN 'institution_staff' THEN 5
      WHEN 'doctor' THEN 6
      WHEN 'nurse' THEN 7
      WHEN 'radiologist' THEN 8
      WHEN 'pathologist' THEN 9
      WHEN 'specialist' THEN 10
      WHEN 'health_personnel' THEN 11
      WHEN 'ot_staff' THEN 12
      WHEN 'triage_staff' THEN 13
      WHEN 'receptionist' THEN 14
      WHEN 'hr_manager' THEN 15
      WHEN 'billing_staff' THEN 16
      WHEN 'pharmacist' THEN 17
      WHEN 'pharmacy' THEN 18
      WHEN 'phlebotomist' THEN 19
      WHEN 'lab_technician' THEN 20
      WHEN 'lab' THEN 21
      WHEN 'inventory_manager' THEN 22
      WHEN 'maintenance_manager' THEN 23
      WHEN 'ambulance_staff' THEN 24
      WHEN 'patient' THEN 25
      ELSE 99
    END
  LIMIT 1
$function$;
