-- Booking-fee validation must never block a patient booking.
--
-- Problem: validate_booking_fee_amount() raised an exception when the
-- provider's specialty was NULL or had no active row in
-- specialty_booking_fees. Because it runs as a BEFORE trigger on
-- booking_fees, and booking_fees rows are created by the
-- charge_booking_fee() trigger on appointments, ANY such gap rolled back
-- the entire appointment INSERT — patients saw "We couldn't create your
-- appointment" for reasons unrelated to their booking.
--
-- Fix: fall back gracefully — NULL specialty resolves to 'General Practice';
-- a specialty with no configured fee falls back to the cheapest active fee;
-- with no fees configured at all, the platform default (K150, matching
-- charge_booking_fee()) applies. Finance can backfill exact amounts later;
-- the booking itself must always succeed.

CREATE OR REPLACE FUNCTION public.validate_booking_fee_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_specialty text;
  v_expected numeric;
BEGIN
  -- Service role bypasses validation
  IF is_service_role() THEN
    RETURN NEW;
  END IF;

  SELECT p.specialty INTO v_specialty
  FROM public.profiles p
  WHERE p.id = NEW.provider_id;

  IF v_specialty IS NULL THEN
    v_specialty := 'General Practice';
  END IF;

  SELECT booking_fee INTO v_expected
  FROM public.specialty_booking_fees
  WHERE specialty = v_specialty
    AND is_active = true
  ORDER BY booking_fee ASC
  LIMIT 1;

  -- No fee configured for this specialty: use the cheapest active fee.
  IF v_expected IS NULL THEN
    SELECT booking_fee INTO v_expected
    FROM public.specialty_booking_fees
    WHERE is_active = true
    ORDER BY booking_fee ASC
    LIMIT 1;
  END IF;

  -- No fees configured at all: platform default (matches charge_booking_fee).
  IF v_expected IS NULL THEN
    v_expected := 150;
  END IF;

  -- Force authoritative amount/currency
  NEW.amount := v_expected;
  IF NEW.currency IS NULL THEN
    NEW.currency := 'ZMW';
  END IF;

  RETURN NEW;
END;
$$;
