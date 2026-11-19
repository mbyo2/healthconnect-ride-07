-- Launch gate 2026-11-19 (Doc'O Clock): REPO/LIVE DRIFT RE-SYNC — no behaviour
-- change. The live definitions of dispense_medicine_batches and
-- enforce_provider_availability were NEWER than anything in this repo (the
-- live dispense function carries the pharmacy-staff authorisation guard and
-- FEFO allocation; the live availability trigger carries the UPDATE
-- short-circuits, the advisory slot lock and the friendly double-booking
-- message). The bodies below are verbatim pg_get_functiondef captures from
-- the live database taken 2026-11-19 during the launch gate, so the repo
-- tells the truth at launch. Applying this file is a no-op.

CREATE OR REPLACE FUNCTION public.dispense_medicine_batches(p_institution_id uuid, p_inventory_table text, p_inventory_item_id uuid, p_quantity integer, p_reference_type text DEFAULT NULL::text, p_reference_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_remaining INTEGER := p_quantity;
    v_batch RECORD;
      v_take INTEGER;
        v_alloc JSONB := '[]'::jsonb;
        BEGIN
          IF NOT public.is_service_role() AND auth.role() IS NOT NULL THEN
            IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
               AND NOT EXISTS (SELECT 1 FROM public.healthcare_institutions hi WHERE hi.id = p_institution_id AND hi.admin_id = auth.uid())
               AND NOT EXISTS (SELECT 1 FROM public.institution_staff st WHERE st.institution_id = p_institution_id AND st.provider_id = auth.uid() AND COALESCE(st.is_active, true)) THEN
              RAISE EXCEPTION 'Only pharmacy staff of this institution can dispense its stock.' USING ERRCODE = '42501';
            END IF;
          END IF;
          IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
            IF p_inventory_table NOT IN ('pharmacy_inventory', 'medication_inventory') THEN RAISE EXCEPTION 'Unknown inventory table: %', p_inventory_table; END IF;
              FOR v_batch IN SELECT id, batch_number, expiry_date, quantity_remaining, unit_cost FROM public.medicine_batches WHERE institution_id = p_institution_id AND inventory_table = p_inventory_table AND inventory_item_id = p_inventory_item_id AND is_active AND qa_status = 'approved' AND expiry_date >= CURRENT_DATE AND quantity_remaining > 0 ORDER BY expiry_date ASC, received_at ASC FOR UPDATE
                LOOP
                    EXIT WHEN v_remaining <= 0;
                        v_take := LEAST(v_batch.quantity_remaining, v_remaining);
                            INSERT INTO public.batch_stock_movements (institution_id, batch_id, movement_type, quantity_change, quantity_after, unit_cost, reference_type, reference_id, notes) VALUES (p_institution_id, v_batch.id, 'dispense', -v_take, 0, v_batch.unit_cost, p_reference_type, p_reference_id, COALESCE(p_notes, 'FEFO dispense'));
                                v_alloc := v_alloc || jsonb_build_object('batch_id', v_batch.id, 'batch_number', v_batch.batch_number, 'expiry_date', v_batch.expiry_date, 'quantity', v_take, 'unit_cost', v_batch.unit_cost);
                                    v_remaining := v_remaining - v_take;
                                      END LOOP;
                                        IF v_remaining > 0 THEN RAISE EXCEPTION 'Insufficient dispensable stock: short by % units (approved, unexpired batches only)', v_remaining; END IF;
                                          RETURN jsonb_build_object('allocated', v_alloc, 'total', p_quantity);
                                          END;
                                          $function$;

CREATE OR REPLACE FUNCTION public.enforce_provider_availability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date;
  v_time time;
  v_app_dow int;
  v_has_availability boolean;
  v_within_hours boolean;
BEGIN
  -- UPDATE short-circuit: slot identity unchanged -> never block.
  IF TG_OP = 'UPDATE'
    AND NEW.provider_id IS NOT DISTINCT FROM OLD.provider_id
    AND NEW.date IS NOT DISTINCT FROM OLD.date
    AND NEW.time IS NOT DISTINCT FROM OLD.time
    AND NEW.appointment_date IS NOT DISTINCT FROM OLD.appointment_date
    AND NEW.appointment_time IS NOT DISTINCT FROM OLD.appointment_time THEN
    RETURN NEW;
  END IF;

  -- UPDATE short-circuit: moving out of an occupying status frees the slot.
  IF TG_OP = 'UPDATE' AND NEW.status NOT IN ('pending', 'scheduled', 'confirmed') THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_date := COALESCE(NEW.appointment_date::date, NEW.date::date);
    v_time := COALESCE(NEW.appointment_time::time, NEW.time::time);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_date IS NULL OR v_time IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.provider_id::text || '|' || v_date::text || '|' || v_time::text, 0));

  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.provider_id = NEW.provider_id AND COALESCE(a.appointment_date::date, a.date::date) = v_date AND COALESCE(a.appointment_time::time, a.time::time) = v_time AND a.status IN ('pending', 'scheduled', 'confirmed') AND a.id IS DISTINCT FROM NEW.id) THEN
    RAISE EXCEPTION 'This time slot is already booked. Please choose another time.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id) INTO v_has_availability;

  IF NOT v_has_availability THEN
    RETURN NEW;
  END IF;

  v_app_dow := (EXTRACT(DOW FROM v_date)::int + 6) % 7;

  SELECT EXISTS (SELECT 1 FROM public.provider_availability pa WHERE pa.provider_id = NEW.provider_id AND ((pa.specific_date IS NOT NULL AND pa.specific_date::date = v_date) OR (COALESCE(pa.is_recurring, true) AND pa.specific_date IS NULL AND pa.day_of_week = v_app_dow)) AND v_time >= pa.start_time::time AND v_time < pa.end_time::time AND (pa.break_start IS NULL OR pa.break_end IS NULL OR v_time < pa.break_start::time OR v_time >= pa.break_end::time)) INTO v_within_hours;

  IF NOT v_within_hours THEN
    RAISE EXCEPTION 'The selected time is outside this provider''s working hours.';
  END IF;

  RETURN NEW;
END;
$function$;
