ALTER TABLE public.video_consultations
  ADD COLUMN IF NOT EXISTS service_code text;

INSERT INTO public.service_pricing (institution_id, service_code, service_label, base_price, currency, category, is_active)
SELECT NULL, v.code, v.label, v.price, 'ZMW', 'video_consultation', true
FROM (VALUES
  ('video_consultation_general', 'General Consultation', 50),
  ('video_consultation_follow-up', 'Follow-up Visit', 30),
  ('video_consultation_specialist', 'Specialist Consultation', 80),
  ('video_consultation_emergency', 'Emergency Consultation', 100)
) AS v(code, label, price)
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_pricing sp
  WHERE sp.service_code = v.code AND sp.institution_id IS NULL
);

CREATE OR REPLACE FUNCTION public.resolve_payment_amount(_reference_type text, _reference_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
BEGIN
  IF _reference_id IS NULL THEN
    RETURN NULL;
  END IF;

  CASE lower(coalesce(_reference_type, ''))
    WHEN 'order' THEN
      SELECT total_amount INTO v_amount FROM public.orders WHERE id = _reference_id;
    WHEN 'booking_fee' THEN
      SELECT amount INTO v_amount FROM public.booking_fees WHERE id = _reference_id;
    WHEN 'healthcare_service' THEN
      SELECT price INTO v_amount FROM public.healthcare_services WHERE id = _reference_id;
    WHEN 'service_pricing' THEN
      SELECT base_price INTO v_amount FROM public.service_pricing WHERE id = _reference_id AND is_active = true;
    WHEN 'invoice' THEN
      SELECT total_amount INTO v_amount FROM public.billing_invoices WHERE id = _reference_id;
    WHEN 'consultation' THEN
      SELECT sp.base_price INTO v_amount
      FROM public.video_consultations vc
      JOIN public.service_pricing sp
        ON sp.service_code = vc.service_code
       AND sp.institution_id IS NULL
       AND sp.is_active = true
      WHERE vc.id = _reference_id;
    ELSE
      v_amount := NULL;
  END CASE;

  RETURN v_amount;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_payment_amount(text, uuid) TO authenticated, service_role;