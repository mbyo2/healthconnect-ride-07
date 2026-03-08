
-- ============================================================
-- CRITICAL: Harden assign_default_role to reject admin escalation
-- Anyone could register with role='admin' or 'super_admin' in metadata
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_raw_role text;
  v_app_role app_role;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  
  -- CRITICAL: Reject admin/super_admin self-assignment via signup metadata
  -- Admin accounts must be created via the create-admin-user edge function
  IF v_raw_role IN ('admin', 'super_admin') THEN
    v_raw_role := 'patient';
  END IF;
  
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
    ELSE v_app_role := 'patient';
  END CASE;
  
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (NEW.id, v_app_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Every non-patient also gets patient role
  IF v_app_role != 'patient' THEN
    INSERT INTO public.user_roles (user_id, role, granted_at)
    VALUES (NEW.id, 'patient', now())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also harden handle_new_user to reject admin via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_raw_role text;
  v_profile_role user_role;
BEGIN
  v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
  
  -- CRITICAL: Block admin self-assignment via signup metadata
  IF v_raw_role IN ('admin', 'super_admin') THEN
    v_raw_role := 'patient';
  END IF;
  
  IF v_raw_role IN ('doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiologist', 'health_personnel', 'pathologist', 'phlebotomist', 'ot_staff', 'triage_staff', 'specialist') THEN
    v_profile_role := 'health_personnel';
  ELSIF v_raw_role IN ('pharmacy', 'lab', 'institution_admin', 'institution_staff', 'receptionist', 'hr_manager', 'cxo', 'billing_staff', 'inventory_manager', 'maintenance_manager', 'ambulance_staff') THEN
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
$$;

-- Drop the specialty update policy that bypasses restrictions
DROP POLICY IF EXISTS "Users can update their own specialty" ON public.profiles;
