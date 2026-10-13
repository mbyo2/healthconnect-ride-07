
DROP POLICY IF EXISTS "Authenticated users access cssd items" ON public.cssd_items;
DROP POLICY IF EXISTS "Authenticated users access diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Authenticated users access day care procedures" ON public.day_care_procedures;
DROP POLICY IF EXISTS "Authenticated users can access radiology requests" ON public.radiology_requests;
DROP POLICY IF EXISTS "Authenticated users can manage radiology requests" ON public.radiology_requests;
DROP POLICY IF EXISTS "Authenticated users can view radiology requests" ON public.radiology_requests;
DROP POLICY IF EXISTS "Authenticated users access provider time slots" ON public.provider_time_slots;
DROP POLICY IF EXISTS "Authenticated users access chart of accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Authenticated users access journal entries" ON public.journal_entries;

DROP POLICY IF EXISTS "Authenticated users access blood bank audit" ON public.blood_bank_audit;
CREATE POLICY "Facility staff read blood bank audit" ON public.blood_bank_audit FOR SELECT TO authenticated
  USING (public.is_institution_staff_member(hospital_id) OR public.is_institution_admin(hospital_id)
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));
CREATE POLICY "Facility staff add blood bank audit" ON public.blood_bank_audit FOR INSERT TO authenticated
  WITH CHECK (public.is_institution_staff_member(hospital_id) OR public.is_institution_admin(hospital_id));

DROP POLICY IF EXISTS "Authenticated users access country statutory configs" ON public.country_statutory_configs;
CREATE POLICY "Facility manages statutory configs" ON public.country_statutory_configs FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id)
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_institution_admin(institution_id)
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "service_tariffs_admin_all" ON public.service_tariffs;
CREATE POLICY "Facility manages service tariffs" ON public.service_tariffs FOR ALL TO authenticated
  USING (public.is_institution_staff_member(institution_id) OR public.is_institution_admin(institution_id)
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_institution_admin(institution_id)
         OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "Service can insert operation logs" ON public.vsdc_operation_logs;
DROP POLICY IF EXISTS "Service can update fiscal submissions" ON public.fiscal_submissions;
DROP POLICY IF EXISTS "Service can insert fiscal submissions" ON public.fiscal_submissions;

CREATE OR REPLACE FUNCTION public.apply_drug_stock_movement(p_item_id uuid, p_movement_type text, p_quantity numeric, p_reason text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE v_item RECORD; v_new_qty numeric; v_movement_id uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO v_item FROM public.drug_stock_items WHERE id = p_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Drug stock item not found'; END IF;
 IF NOT (public.is_institution_staff_member(v_item.institution_id) OR public.is_institution_admin(v_item.institution_id)) THEN
   RAISE EXCEPTION 'Not permitted for this facility'; END IF;
 IF p_movement_type NOT IN ('received','issued','adjusted','expired','damaged') THEN RAISE EXCEPTION 'Invalid movement type: %', p_movement_type; END IF;
 IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
 IF p_movement_type = 'received' OR p_movement_type = 'adjusted' THEN v_new_qty := v_item.quantity + p_quantity;
 ELSE IF v_item.quantity < p_quantity THEN RAISE EXCEPTION 'Insufficient stock: % available, % requested', v_item.quantity, p_quantity; END IF; v_new_qty := v_item.quantity - p_quantity; END IF;
 UPDATE public.drug_stock_items SET quantity = v_new_qty WHERE id = p_item_id;
 INSERT INTO public.drug_stock_movements (institution_id, drug_stock_item_id, movement_type, quantity, quantity_before, quantity_after, reason, performed_by)
 VALUES (v_item.institution_id, p_item_id, p_movement_type, p_quantity, v_item.quantity, v_new_qty, p_reason, auth.uid()) RETURNING id INTO v_movement_id;
 RETURN v_movement_id; END; $function$;
REVOKE EXECUTE ON FUNCTION public.apply_drug_stock_movement(uuid,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_drug_stock_movement(uuid,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_pharmacy_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE v_count integer; v_date text; BEGIN
  IF NOT (p_pharmacy_id = auth.uid() OR public.is_institution_staff_member(p_pharmacy_id) OR public.is_institution_admin(p_pharmacy_id) OR public.is_service_role()) THEN
    RAISE EXCEPTION 'Not permitted for this pharmacy'; END IF;
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_count FROM public.pos_sales WHERE pharmacy_id = p_pharmacy_id AND created_at::date = CURRENT_DATE;
  RETURN 'RCP-' || v_date || '-' || LPAD(v_count::text, 4, '0');
END; $function$;
REVOKE EXECUTE ON FUNCTION public.generate_receipt_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolve_payment_amount(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_payment_amount(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_appointment_fee()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN
  IF public.is_service_role() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN NEW.consultation_fee := OLD.consultation_fee; RETURN NEW; END IF;
  SELECT p.consultation_fee_min INTO NEW.consultation_fee FROM public.profiles p WHERE p.id = NEW.provider_id;
  RETURN NEW; END; $function$;
DROP TRIGGER IF EXISTS trg_enforce_appointment_fee ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_fee BEFORE INSERT OR UPDATE OF consultation_fee ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_fee();

ALTER FUNCTION public.prevent_applicant_review_field_updates() SET search_path = public;
ALTER FUNCTION public.check_low_stock_alerts() SET search_path = public;
ALTER FUNCTION public.log_institution_approval() SET search_path = public;
ALTER FUNCTION public.mark_provider_complete_on_approval() SET search_path = public;
ALTER FUNCTION public.get_provider_application_details(uuid) SET search_path = public;
ALTER FUNCTION public.get_institution_application_details(uuid) SET search_path = public;
ALTER FUNCTION public.get_institution_compliance_status(uuid) SET search_path = public;
ALTER FUNCTION public.grant_institution_admin_on_approval() SET search_path = public;
ALTER FUNCTION public.get_procedure_price(uuid,uuid,date) SET search_path = public;
ALTER FUNCTION public.check_financial_controls(uuid,numeric,text) SET search_path = public;
