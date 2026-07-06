
CREATE OR REPLACE FUNCTION public.process_refund_atomic(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text,
  p_requester uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_already_refunded numeric;
  v_is_admin boolean;
  v_fully boolean;
  v_refund_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  SELECT (admin_level IN ('admin','superadmin')) INTO v_is_admin
    FROM public.profiles WHERE id = p_requester;
  v_is_admin := COALESCE(v_is_admin, false);

  IF NOT v_is_admin
     AND v_payment.patient_id IS DISTINCT FROM p_requester
     AND v_payment.provider_id IS DISTINCT FROM p_requester THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF v_payment.status <> 'completed' THEN
    RAISE EXCEPTION 'Payment is not eligible for refund';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_already_refunded
    FROM public.refunds
    WHERE payment_id = p_payment_id
      AND (status IS NULL OR status NOT IN ('failed','cancelled'));

  IF v_already_refunded >= v_payment.amount THEN
    RAISE EXCEPTION 'Payment has already been fully refunded';
  END IF;
  IF (p_amount + v_already_refunded) > v_payment.amount THEN
    RAISE EXCEPTION 'Refund amount exceeds remaining refundable balance';
  END IF;

  INSERT INTO public.refunds (payment_id, amount, reason, status)
  VALUES (p_payment_id, p_amount, p_reason, 'completed')
  RETURNING id INTO v_refund_id;

  v_fully := (p_amount + v_already_refunded) >= v_payment.amount;
  IF v_fully THEN
    UPDATE public.payments SET status = 'refunded', updated_at = now() WHERE id = p_payment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'refund_id', v_refund_id, 'fully_refunded', v_fully);
END;
$$;

REVOKE ALL ON FUNCTION public.process_refund_atomic(uuid, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_refund_atomic(uuid, numeric, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.has_care_relationship(_provider uuid, _patient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _provider = _patient
    OR EXISTS (
      SELECT 1 FROM public.appointments
      WHERE provider_id = _provider AND patient_id = _patient
    )
    OR EXISTS (
      SELECT 1 FROM public.user_connections
      WHERE provider_id = _provider AND patient_id = _patient AND status = 'approved'
    )
    OR EXISTS (
      SELECT 1
      FROM public.institution_staff s
      JOIN public.appointments a
        ON a.institution_id = s.institution_id
      WHERE s.provider_id = _provider
        AND s.is_active = true
        AND a.patient_id = _patient
    )
    OR EXISTS (
      SELECT 1 FROM public.hospital_admissions ha
      JOIN public.institution_staff s ON s.institution_id = ha.hospital_id
      WHERE ha.patient_id = _patient
        AND s.provider_id = _provider
        AND s.is_active = true
    )
$$;

GRANT EXECUTE ON FUNCTION public.has_care_relationship(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Providers can view allergies" ON public.patient_allergies;
DROP POLICY IF EXISTS "Providers can view patient allergies" ON public.patient_allergies;

CREATE POLICY "Providers with care relationship can view allergies"
ON public.patient_allergies
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_care_relationship(auth.uid(), patient_id)
);

DROP POLICY IF EXISTS "Providers can view conditions" ON public.patient_conditions;

CREATE POLICY "Providers with care relationship can view conditions"
ON public.patient_conditions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
  OR public.has_care_relationship(auth.uid(), patient_id)
);

DROP POLICY IF EXISTS "Providers can upload attachments" ON public.medical_record_attachments;

CREATE POLICY "Uploaders must own or provide care for the record"
ON public.medical_record_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.comprehensive_medical_records r
    WHERE r.id = medical_record_attachments.record_id
      AND (
        r.patient_id = auth.uid()
        OR r.provider_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'super_admin'::app_role)
      )
  )
);

CREATE OR REPLACE FUNCTION public.prevent_profile_self_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'super_admin'::app_role)
     OR public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.admin_level IS DISTINCT FROM OLD.admin_level
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.provider_type IS DISTINCT FROM OLD.provider_type THEN
      RAISE EXCEPTION 'You cannot modify privileged profile fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_self_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_self_elevation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_elevation();
