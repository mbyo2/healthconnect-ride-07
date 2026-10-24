-- Stage B (Worker 3) — RPC / SECURITY DEFINER cluster hardening: P1-12 … P1-18
-- Applied live to project tthzcijscedgxjfnfnky on 2026-10-24 via Management API;
-- this file mirrors the live changes exactly.
--
-- P1-12 dispense_medicine_batches: in-body caller check (service role / direct DB /
--   platform admin / institution admin / ACTIVE institution_staff member of the
--   institution — institution_staff.provider_id is the user link, is_active the
--   active flag; any active staff role is accepted because dispensing is a
--   pharmacy-team act and the role column is free text) + EXECUTE revoked from
--   PUBLIC/anon.
-- P1-13 process_payment_with_splits (both overloads): service-only guard prepended.
--   The 4-arg overload was a LANGUAGE sql delegating wrapper; it is now plpgsql
--   with the same delegation so it can carry the same guard.
-- P1-14 process_refund_atomic: requester must act as themselves when a user JWT
--   is present; admin test now reads user_roles via has_role() instead of the
--   legacy profiles.admin_level column.
-- P1-15 admin_delete_user_execute / admin_delete_user_counts: verified ABSENT
--   live — no change. (delete_user() exists with postgres/authenticated/
--   service_role EXECUTE — observation only, untouched.)
-- P1-16 signup role escalation: assign_default_role now grants ONLY 'patient' at
--   signup regardless of metadata role. auto_create_provider_application no
--   longer creates a healthcare_institutions row (or seeded departments) at
--   signup; pharmacy/lab/institution_admin intent is recorded as a PENDING
--   institution_applications row. Provider intent still creates the pending
--   health_personnel_applications row. Roles are granted on admin approval by
--   the PRE-EXISTING triggers trg_grant_provider_role_on_approval /
--   trg_grant_institution_admin_on_approval (verified live; they read the
--   profession from auth metadata and insert into user_roles), so no new
--   approval mechanism was needed.
-- P1-17 emergency access: eligibility narrowed from role<>'patient' to the
--   clinical profession list in emergency_patient_search,
--   request_break_glass_access and log_emergency_lookup.
--   emergency_patient_search is now plpgsql and writes its own
--   patient_access_audit row (access_type='emergency_search') per returned
--   patient, so the audit can no longer be skipped by the caller. EXECUTE
--   revoked from PUBLIC/anon on all three functions.
-- P1-18 courier RPCs (assign_courier_to_delivery, release_courier,
--   dispatch_nearest_courier): verified ABSENT live — no change. The app
--   assigns couriers by writing delivery_orders.courier_id directly under RLS.

-- p112_dispense
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

-- p112_acl
REVOKE EXECUTE ON FUNCTION public.dispense_medicine_batches(uuid, text, uuid, integer, text, uuid, text) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.dispense_medicine_batches(uuid, text, uuid, integer, text, uuid, text) TO authenticated, service_role;

-- p113_splits5
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(p_payment_id uuid, p_total_amount numeric, p_provider_id uuid, p_institution_id uuid DEFAULT NULL::uuid, p_payment_type text DEFAULT 'consultation'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                    DECLARE
                        v_app_commission DECIMAL(5,2);
                            v_app_amount DECIMAL(10,2);
                                v_institution_amount DECIMAL(10,2);
                                    v_personnel_amount DECIMAL(10,2);
                                        v_pharmacy_amount DECIMAL(10,2);
                                        BEGIN
  IF NOT public.is_service_role() AND auth.role() IS NOT NULL THEN RAISE EXCEPTION 'This operation is restricted to the payment service.' USING ERRCODE = '42501'; END IF;
                                            SELECT commission_percentage INTO v_app_commission
                                            FROM commission_settings WHERE entity_type = 'app_owner' AND is_active = true; v_app_commission := COALESCE(v_app_commission, 0); v_app_amount := p_total_amount * (v_app_commission / 100); IF p_payment_type = 'pharmacy' THEN v_pharmacy_amount := p_total_amount - v_app_amount; v_personnel_amount := 0; v_institution_amount := 0; ELSIF p_institution_id IS NOT NULL THEN v_institution_amount := p_total_amount - v_app_amount; v_personnel_amount := 0; v_pharmacy_amount := 0; ELSE v_personnel_amount := p_total_amount - v_app_amount; v_institution_amount := 0; v_pharmacy_amount := 0; END IF; INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage) VALUES (p_payment_id, (SELECT id FROM app_owner_wallet LIMIT 1), 'app_owner', v_app_amount, v_app_commission); INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage) VALUES (p_payment_id, p_provider_id, 'health_personnel', v_personnel_amount, 100 - v_app_commission); IF p_institution_id IS NOT NULL AND p_payment_type != 'pharmacy' THEN INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage) VALUES (p_payment_id, p_institution_id, 'institution', v_institution_amount, 100 - v_app_commission); END IF; IF p_payment_type = 'pharmacy' AND p_institution_id IS NOT NULL THEN INSERT INTO payment_splits (payment_id, recipient_id, recipient_type, amount, percentage) VALUES (p_payment_id, p_institution_id, 'pharmacy', v_pharmacy_amount, 100 - v_app_commission); END IF; UPDATE app_owner_wallet SET balance = balance + v_app_amount, updated_at = now() WHERE id = (SELECT id FROM app_owner_wallet LIMIT 1); UPDATE user_wallets SET balance = balance + v_personnel_amount, updated_at = now() WHERE user_id = p_provider_id; IF p_institution_id IS NOT NULL AND (v_institution_amount > 0 OR v_pharmacy_amount > 0) THEN INSERT INTO institution_wallets (institution_id, balance) VALUES (p_institution_id, COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0)) ON CONFLICT (institution_id) DO UPDATE SET balance = institution_wallets.balance + COALESCE(v_institution_amount, 0) + COALESCE(v_pharmacy_amount, 0), updated_at = now(); END IF; UPDATE payment_splits SET status = 'completed', processed_at = now() WHERE payment_id = p_payment_id; RETURN jsonb_build_object('success', true, 'app_amount', v_app_amount, 'institution_amount', v_institution_amount, 'personnel_amount', v_personnel_amount, 'pharmacy_amount', v_pharmacy_amount, 'payment_type', p_payment_type); END; $function$;

-- p113_splits4
CREATE OR REPLACE FUNCTION public.process_payment_with_splits(p_payment_id uuid, p_total_amount numeric, p_provider_id uuid, p_institution_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_service_role() AND auth.role() IS NOT NULL THEN RAISE EXCEPTION 'This operation is restricted to the payment service.' USING ERRCODE = '42501'; END IF;
  RETURN public.process_payment_with_splits(p_payment_id, p_total_amount, p_provider_id, p_institution_id, 'consultation');
END;
$function$;

-- p114_refund
CREATE OR REPLACE FUNCTION public.process_refund_atomic(p_payment_id uuid, p_amount numeric, p_reason text, p_requester uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment payments%ROWTYPE;
  v_already_refunded numeric;
  v_is_admin boolean;
  v_fully boolean;
  v_refund_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND p_requester IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'A refund requester must act as themselves.' USING ERRCODE = '42501'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;

  v_is_admin := public.has_role(p_requester, 'admin') OR public.has_role(p_requester, 'super_admin');

  -- Only admins or the provider on the payment can approve a refund.
  -- Patients cannot self-refund; they must request via a reviewed workflow.
  IF NOT v_is_admin
     AND v_payment.provider_id IS DISTINCT FROM p_requester THEN
    RAISE EXCEPTION 'Forbidden: refunds require provider or admin approval';
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
$function$;

-- p116_assign_role
CREATE OR REPLACE FUNCTION public.assign_default_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Stage B / P1-16: a self-registered user receives ONLY the 'patient'
  -- role at signup, whatever role the signup metadata claims. Provider
  -- and institution roles are granted later, on admin approval, by the
  -- existing approval triggers grant_provider_role_on_approval() and
  -- grant_institution_admin_on_approval().
  INSERT INTO public.user_roles (user_id, role, granted_at)
  VALUES (NEW.id, 'patient', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- p116_auto_app
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
            v_inst_type healthcare_provider_type;
             v_inst_id uuid;
              v_archetype text;
               BEGIN
                v_raw_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient');
                 IF v_raw_role = 'patient' THEN
                  RETURN NEW;
                   END IF;
                    v_license := COALESCE(NEW.raw_user_meta_data->>'license_number', '');
                     v_specialty := COALESCE(NEW.raw_user_meta_data->>'specialty', v_raw_role);
                      v_business_name := NEW.raw_user_meta_data->>'business_name';
                       v_business_type := NEW.raw_user_meta_data->>'business_type';
                        IF EXISTS (
                         SELECT 1 FROM public.provider_types pt
                          WHERE pt.code = v_raw_role AND pt.is_active
                           ) THEN
                            INSERT INTO public.health_personnel_applications (
                             user_id, license_number, specialty, years_of_experience, status, experience_level
                              ) VALUES (
                               NEW.id, v_license, v_specialty, 0, 'pending', 'entry'
                                ) ON CONFLICT (user_id) DO NOTHING;
                                 END IF;
IF v_raw_role IN ('pharmacy', 'lab', 'institution_admin') AND v_business_name IS NOT NULL THEN
    -- Stage B / P1-16: institution intent is recorded as a PENDING
    -- application only. No healthcare_institutions row is created at
    -- signup; the institution is provisioned when an admin approves the
    -- application (grant_institution_admin_on_approval + admin UI).
    INSERT INTO public.institution_applications (applicant_id, institution_name, institution_type, status)
    VALUES (NEW.id, v_business_name, COALESCE(v_business_type, CASE v_raw_role WHEN 'pharmacy' THEN 'pharmacy' WHEN 'lab' THEN 'laboratory' ELSE 'clinic' END), 'pending');
  END IF;
  RETURN NEW;
END;
$function$;

-- p117_search
CREATE OR REPLACE FUNCTION public.emergency_patient_search(q text)
 RETURNS TABLE(pid uuid, nm text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row RECORD;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role IN ('doctor','specialist','medical_licentiate','clinical_officer','dentist','dental_therapist','radiologist','radiographer','nurse','registered_nurse','enrolled_nurse','midwife','pharmacist','pharmacy_technologist','physiotherapist','occupational_therapist','nutritionist','optometrist','optician','psychologist','pathologist','community_health_worker','environmental_health_officer','ambulance_staff','ot_staff','triage_staff','traditional_practitioner')) THEN
    RAISE EXCEPTION 'Only clinical staff may use emergency patient search.' USING ERRCODE = '42501';
  END IF;
  FOR v_row IN
    SELECT p.id, concat_ws(' ', p.first_name, p.last_name) AS full_name
    FROM public.profiles p
    WHERE position(lower(trim(coalesce(q, ''))) in lower(concat_ws(' ', p.first_name, p.last_name))) > 0
      AND char_length(trim(coalesce(q, ''))) >= 2
    LIMIT 20
  LOOP
    INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, search_term, reason)
    VALUES (v_uid, v_row.id, 'emergency_search', q, 'search:' || q);
    pid := v_row.id;
    nm := v_row.full_name;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$function$;

-- p117_breakglass
CREATE OR REPLACE FUNCTION public.request_break_glass_access(p_patient_id uuid, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_clinician uuid; v_grant_id uuid; v_is_clinical boolean; BEGIN v_clinician := auth.uid(); IF v_clinician IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF; IF p_patient_id IS NULL THEN RAISE EXCEPTION 'Patient is required'; END IF; IF p_reason IS NULL OR char_length(trim(p_reason)) < 10 THEN RAISE EXCEPTION 'Emergency reason is required (minimum 10 characters)'; END IF; SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_clinician AND ur.role IN ('doctor','specialist','medical_licentiate','clinical_officer','dentist','dental_therapist','radiologist','radiographer','nurse','registered_nurse','enrolled_nurse','midwife','pharmacist','pharmacy_technologist','physiotherapist','occupational_therapist','nutritionist','optometrist','optician','psychologist','pathologist','community_health_worker','environmental_health_officer','ambulance_staff','ot_staff','triage_staff','traditional_practitioner')) INTO v_is_clinical; IF NOT v_is_clinical THEN RAISE EXCEPTION 'Only clinical staff may request emergency access'; END IF; UPDATE public.emergency_access_grants SET revoked_at = now(), revoked_by = v_clinician WHERE clinician_id = v_clinician AND patient_id = p_patient_id AND revoked_at IS NULL AND expires_at > now(); INSERT INTO public.emergency_access_grants (clinician_id, patient_id, reason) VALUES (v_clinician, p_patient_id, trim(p_reason)) RETURNING id INTO v_grant_id; INSERT INTO public.patient_access_audit (accessor_id, patient_id, access_type, reason, expires_at) VALUES (v_clinician, p_patient_id, 'break_glass', trim(p_reason), now() + interval '4 hours'); RETURN v_grant_id; END; $function$;

-- p117_log
CREATE OR REPLACE FUNCTION public.log_emergency_lookup(p_term text, p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE c uuid;BEGIN c:=auth.uid();IF c IS NULL OR NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=c AND role IN ('doctor','specialist','medical_licentiate','clinical_officer','dentist','dental_therapist','radiologist','radiographer','nurse','registered_nurse','enrolled_nurse','midwife','pharmacist','pharmacy_technologist','physiotherapist','occupational_therapist','nutritionist','optometrist','optician','psychologist','pathologist','community_health_worker','environmental_health_officer','ambulance_staff','ot_staff','triage_staff','traditional_practitioner'))THEN RETURN;END IF;INSERT INTO patient_access_audit(accessor_id,patient_id,access_type,search_term)SELECT c,i,'emergency_lookup',p_term FROM unnest(p_ids)i;END;$function$;

-- p117_acl
REVOKE EXECUTE ON FUNCTION public.emergency_patient_search(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emergency_patient_search(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.log_emergency_lookup(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_emergency_lookup(text, uuid[]) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.request_break_glass_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_break_glass_access(uuid, text) TO authenticated, service_role;
