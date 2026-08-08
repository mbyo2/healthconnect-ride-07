-- 1. patient_feedback: hospital-scoped
DROP POLICY IF EXISTS "Patients can view own feedback" ON public.patient_feedback;
CREATE POLICY "Patients can view own feedback"
ON public.patient_feedback FOR SELECT TO authenticated
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_institution_admin(hospital_id)
  OR public.is_institution_staff_member(hospital_id)
);

DROP POLICY IF EXISTS "Admins can manage feedback" ON public.patient_feedback;
CREATE POLICY "Admins can manage feedback"
ON public.patient_feedback FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_institution_admin(hospital_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.is_institution_admin(hospital_id)
);

-- 2. sms_logs: platform admins + own records only
DROP POLICY IF EXISTS "Institution admins view SMS logs" ON public.sms_logs;
CREATE POLICY "Platform admins view SMS logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 3. drug_risk_levels: platform admins only for writes
DROP POLICY IF EXISTS "Admins can manage drug risk levels" ON public.drug_risk_levels;
CREATE POLICY "Platform admins can manage drug risk levels"
ON public.drug_risk_levels FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 4. password_policies: hospital-scoped
DROP POLICY IF EXISTS "Admins can manage password policies" ON public.password_policies;
DROP POLICY IF EXISTS "Admins can read password policies" ON public.password_policies;

CREATE POLICY "Read password policies"
ON public.password_policies FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR (hospital_id IS NOT NULL AND (
        public.is_institution_admin(hospital_id)
        OR public.is_institution_staff_member(hospital_id)
     ))
);

CREATE POLICY "Manage password policies"
ON public.password_policies FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR (COALESCE(is_global, false) = false AND hospital_id IS NOT NULL AND public.is_institution_admin(hospital_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR (COALESCE(is_global, false) = false AND hospital_id IS NOT NULL AND public.is_institution_admin(hospital_id))
);

-- 5. Block privileged role self-assignment at signup
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

  CASE v_raw_role
    WHEN 'doctor' THEN v_app_role := 'doctor';
    WHEN 'nurse' THEN v_app_role := 'nurse';
    WHEN 'pharmacist' THEN v_app_role := 'pharmacist';
    WHEN 'lab_technician' THEN v_app_role := 'lab_technician';
    WHEN 'radiologist' THEN v_app_role := 'radiologist';
    WHEN 'pharmacy' THEN v_app_role := 'pharmacy';
    WHEN 'lab' THEN v_app_role := 'lab';
    WHEN 'institution_admin' THEN v_app_role := 'institution_admin';
    WHEN 'health_personnel' THEN v_app_role := 'health_personnel';
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

  IF v_raw_role IN ('doctor', 'nurse', 'pharmacist', 'lab_technician', 'radiologist', 'health_personnel', 'pathologist', 'phlebotomist', 'specialist')
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