-- Auto-generate billing record when an appointment is completed
-- This wires the appointments module to the billing module

CREATE OR REPLACE FUNCTION public.create_billing_on_appointment_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution_id UUID;
  v_fee DECIMAL(10,2);
  v_invoice_number TEXT;
BEGIN
  -- Only fire when status changes to 'completed'
  IF OLD.status = NEW.status OR NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get the institution (from provider's institution or appointment's facility)
  -- Try to find via the provider's institution_staff link
  SELECT institution_id INTO v_institution_id
  FROM public.institution_staff
  WHERE provider_id = NEW.provider_id
  LIMIT 1;

  -- If no institution found, skip (can't bill without institution)
  IF v_institution_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the consultation fee (from provider profile or default)
  SELECT COALESCE(consultation_fee_min, 150.00) INTO v_fee
  FROM public.profiles
  WHERE id = NEW.provider_id;

  -- Generate invoice number
  v_invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Create the billing record
  INSERT INTO public.hospital_billing (
    hospital_id,
    patient_id,
    invoice_number,
    items,
    subtotal,
    total_amount,
    payment_status,
    notes
  ) VALUES (
    v_institution_id,
    NEW.patient_id,
    v_invoice_number,
    jsonb_build_array(
      jsonb_build_object(
        'description', 'Consultation - ' || COALESCE(NEW.type, 'General'),
        'quantity', 1,
        'unit_price', v_fee,
        'amount', v_fee,
        'appointment_id', NEW.id
      )
    ),
    v_fee,
    v_fee,
    'pending',
    'Auto-generated from completed appointment ' || NEW.id::TEXT
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_appointment_complete_billing ON public.appointments;

-- Create the trigger
CREATE TRIGGER trg_appointment_complete_billing
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_billing_on_appointment_complete();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_billing_on_appointment_complete() TO authenticated;
