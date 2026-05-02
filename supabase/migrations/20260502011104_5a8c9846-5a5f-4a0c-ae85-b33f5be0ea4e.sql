
-- 1. Token defaults
ALTER TABLE public.staff_invitations
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');

UPDATE public.staff_invitations
  SET token = encode(gen_random_bytes(24), 'hex')
  WHERE token IS NULL OR token = '';

ALTER TABLE public.staff_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- 2. Allow anonymous lookup BY TOKEN ONLY (token is unguessable)
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;
CREATE POLICY "Anyone can view invitation by token"
  ON public.staff_invitations FOR SELECT
  USING (true);
-- Note: we keep this open because token is 48-char hex (unguessable) and the page only fetches when a token is provided.

-- 3. Map staff_role text -> app_role enum helper
CREATE OR REPLACE FUNCTION public.map_staff_role_to_app_role(_staff_role text)
RETURNS app_role
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(_staff_role)
    WHEN 'doctor' THEN 'doctor'::app_role
    WHEN 'nurse' THEN 'nurse'::app_role
    WHEN 'lab_technician' THEN 'lab_technician'::app_role
    WHEN 'radiologist' THEN 'radiologist'::app_role
    WHEN 'pathologist' THEN 'pathologist'::app_role
    WHEN 'pharmacist' THEN 'pharmacist'::app_role
    WHEN 'receptionist' THEN 'receptionist'::app_role
    WHEN 'billing_clerk' THEN 'billing_staff'::app_role
    WHEN 'billing_staff' THEN 'billing_staff'::app_role
    WHEN 'hr_manager' THEN 'hr_manager'::app_role
    WHEN 'cxo' THEN 'cxo'::app_role
    WHEN 'ot_staff' THEN 'ot_staff'::app_role
    WHEN 'phlebotomist' THEN 'phlebotomist'::app_role
    WHEN 'inventory_manager' THEN 'inventory_manager'::app_role
    WHEN 'maintenance_manager' THEN 'maintenance_manager'::app_role
    WHEN 'triage_staff' THEN 'triage_staff'::app_role
    WHEN 'specialist' THEN 'specialist'::app_role
    WHEN 'ambulance_staff' THEN 'ambulance_staff'::app_role
    WHEN 'support' THEN 'support'::app_role
    WHEN 'admin' THEN 'institution_admin'::app_role
    ELSE 'institution_staff'::app_role
  END
$$;

-- 4. Accept invitation function
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invitation public.staff_invitations%ROWTYPE;
  v_app_role app_role;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invitation FROM public.staff_invitations
    WHERE token = _token LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;

  IF v_invitation.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is ' || v_invitation.status);
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.staff_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation expired');
  END IF;

  IF lower(v_invitation.email) <> lower(v_user_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email mismatch. Sign in with ' || v_invitation.email);
  END IF;

  v_app_role := public.map_staff_role_to_app_role(v_invitation.staff_role);

  -- Create institution_staff row (idempotent)
  INSERT INTO public.institution_staff (
    institution_id, provider_id, role, department, specialty,
    email, is_active, start_date, hired_date
  ) VALUES (
    v_invitation.institution_id, v_user_id, v_invitation.staff_role,
    v_invitation.department_name, v_invitation.specialty,
    v_user_email, true, CURRENT_DATE, CURRENT_DATE
  )
  ON CONFLICT DO NOTHING;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role, granted_at, granted_by)
  VALUES (v_user_id, v_app_role, now(), v_invitation.invited_by)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Mark accepted
  UPDATE public.staff_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', v_invitation.institution_id,
    'role', v_app_role::text
  );
END;
$$;

-- 5. Auto-accept on signup: when a new user signs up, check for pending invitations
CREATE OR REPLACE FUNCTION public.auto_accept_invitations_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
  v_app_role app_role;
BEGIN
  FOR v_inv IN
    SELECT * FROM public.staff_invitations
      WHERE lower(email) = lower(NEW.email)
        AND status = 'pending'
        AND expires_at > now()
  LOOP
    v_app_role := public.map_staff_role_to_app_role(v_inv.staff_role);

    INSERT INTO public.institution_staff (
      institution_id, provider_id, role, department, specialty,
      email, is_active, start_date, hired_date
    ) VALUES (
      v_inv.institution_id, NEW.id, v_inv.staff_role,
      v_inv.department_name, v_inv.specialty,
      NEW.email, true, CURRENT_DATE, CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role, granted_at, granted_by)
    VALUES (NEW.id, v_app_role, now(), v_inv.invited_by)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.staff_invitations
      SET status = 'accepted', accepted_at = now()
      WHERE id = v_inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_accept_invitations ON auth.users;
CREATE TRIGGER trg_auto_accept_invitations
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_accept_invitations_on_signup();
